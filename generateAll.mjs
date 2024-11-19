import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import os from 'os';
import AdmZip from 'adm-zip';

const execAsync = promisify(exec);

const BUCKET_NAME = process.env.GIT_BUCKET_NAME;

const OUTPUT_DIR = path.join(process.cwd(), 'generated_html');

async function listS3Repos() {
    try {
        const { stdout } = await execAsync(`aws s3 ls s3://${BUCKET_NAME}/`);
        return stdout
            .split('\n')
            .filter((line) => line.endsWith('/'))
            .map((line) => line.split(' ').pop().replace('/', ''));
    } catch (error) {
        console.error('Error listing S3 repos:', error);
        throw error;
    }
}

async function downloadFromS3(repoName) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-'));
    const zipPath = path.join(tempDir, 'repo.zip');
    try {
        console.log(`Downloading ${repoName} from S3...`);
        await execAsync(
            `aws s3 cp s3://${BUCKET_NAME}/${repoName}/repo.zip ${zipPath}`
        );
        console.log(`Downloaded ${repoName} to ${zipPath}`);
        return zipPath;
    } catch (error) {
        console.error(`Error downloading ${repoName}:`, error);
        throw error;
    }
}

async function generateHtmlForRepo(zipPath, repoName) {
    const outputDir = path.join(OUTPUT_DIR, repoName);
    console.log(`Output directory: ${outputDir}`);

    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    let fileLinks = [];

    for (const entry of zipEntries) {
        if (!entry.isDirectory && !entry.entryName.startsWith('.')) {
            console.log(`Processing file: ${entry.entryName}`);
            const content = entry.getData().toString('utf8');
            const extension = path.extname(entry.entryName).slice(1);

            const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${entry.entryName}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
              <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
              <script>hljs.highlightAll();</script>
            </head>
            <body class="">
              <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold mb-4 pb-2 border-b">${
                    entry.entryName
                }</h1>
                <pre class="bg-white"><code class="text-sm language-${extension}">${escapeHtml(
                content
            )}</code></pre>
              </div>
              </body>
            </html>
          `;

            const outputPath = path.join(outputDir, `${entry.entryName}.html`);
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, htmlContent);

            fileLinks.push({
                path: entry.entryName,
                type: getFileType(entry.entryName),
            });
            console.log(`Generated HTML for: ${entry.entryName}`);
        }
    }

    fileLinks.sort((a, b) => a.path.localeCompare(b.path));

    const indexContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${repoName}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/lucide@latest"></script>
    </head>
    <body class="bg-gray-100">
      <div class="bg-gray-800 text-white py-4 mb-6">
        <div class="container mx-auto px-4">
          <h1 class="text-xl font-semibold flex items-center">
            <i data-lucide="git-branch" class="mr-2"></i> ${repoName}
          </h1>
        </div>
      </div>
      <div class="container mx-auto px-4">
        <div class="bg-white rounded-lg shadow p-4">
          ${renderFileTree(fileLinks)}
        </div>
      </div>
      <script>
        lucide.createIcons();
        document.querySelectorAll('.folder').forEach(folder => {
          folder.addEventListener('click', (e) => {
            e.stopPropagation();
            folder.classList.toggle('active');
            const icon = folder.querySelector('[data-lucide]');
            if (folder.classList.contains('active')) {
              icon.setAttribute('data-lucide', 'folder-open');
            } else {
              icon.setAttribute('data-lucide', 'folder');
            }
            lucide.createIcons();
            
            const nestedContent = folder.nextElementSibling;
            if (nestedContent) {
              nestedContent.style.display = folder.classList.contains('active') ? 'block' : 'none';
            }
          });
        });
      </script>
    </body>
    </html>
    `;

    await fs.writeFile(path.join(outputDir, 'index.html'), indexContent);
    console.log('Generated index.html');

    console.log('HTML generation complete!');
}

function renderFileTree(files) {
    let html = '<ul class="space-y-1">';
    let currentPath = [];

    files.forEach((file, index) => {
        const parts = file.path.split('/');
        let indent = 0;

        // Determine the common path and indent level
        while (
            indent < currentPath.length &&
            indent < parts.length - 1 &&
            parts[indent] === currentPath[indent]
        ) {
            indent++;
        }

        // Close previous folders if needed
        while (currentPath.length > indent) {
            html += '</ul></li>';
            currentPath.pop();
        }

        // Open new folders if needed
        while (indent < parts.length - 1) {
            const folderName = parts[indent];
            html += `
              <li>
                <div class="folder flex items-center cursor-pointer text-gray-700 hover:text-blue-600 pl-${
                    indent * 4
                }">
                  <i data-lucide="folder" class="mr-2 w-4 h-4"></i>
                  <span>${folderName}</span>
                </div>
                <ul class="nested" style="display: none;">
          `;
            currentPath.push(folderName);
            indent++;
        }

        // Render the file
        const fileName = parts[parts.length - 1];
        html += `
          <li class="pl-${indent * 4}">
            <a href="${
                file.path
            }.html" class="flex items-center text-gray-700 hover:text-blue-600">
              <i data-lucide="${file.type}" class="mr-2 w-4 h-4"></i>
              <span>${fileName}</span>
            </a>
          </li>
      `;
    });

    // Close any remaining open folders
    while (currentPath.length > 0) {
        html += '</ul></li>';
        currentPath.pop();
    }

    html += '</ul>';
    return html;
}

function getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.js':
        case '.ts':
            return 'file-code';
        case '.html':
            return 'file-code';
        case '.css':
            return 'file-code';
        case '.json':
            return 'file-json';
        case '.md':
            return 'file-text';
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
            return 'image';
        default:
            return 'file';
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function main() {
    try {
        const repos = await listS3Repos();
        console.log('Found repositories:', repos);

        await fs.mkdir(OUTPUT_DIR, { recursive: true });

        for (const repo of repos) {
            console.log(`Processing repository: ${repo}`);
            let zipPath;
            try {
                zipPath = await downloadFromS3(repo);
                await generateHtmlForRepo(zipPath, repo);
                console.log(`Finished processing repository: ${repo}`);
            } catch (error) {
                console.error(`Error processing repository ${repo}:`, error);
            } finally {
                if (zipPath) {
                    await fs.unlink(zipPath);
                }
            }
        }

        console.log('HTML generation for all repositories complete!');
    } catch (error) {
        console.error('Error in main process:', error);
    }
}
main().catch(console.error);

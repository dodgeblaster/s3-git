const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const repoPath = './';
const outputDir = './gen';
async function generateHtmlFiles() {
    try {
        process.chdir(repoPath);
        const latestCommit = execSync('git rev-parse HEAD').toString().trim();
        const tree = execSync(`git ls-tree -r ${latestCommit}`).toString();
        const files = tree.split('\n').filter((line) => line.trim() !== '');

        let fileLinks = [];

        for (const file of files) {
            const [, type, , filePath] = file.split(/\s+/);

            if (type === 'blob') {
                const content = execSync(
                    `git show ${latestCommit}:${filePath}`
                ).toString();
                const extension = path.extname(filePath).slice(1);

                const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${filePath}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
              <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
              <script>hljs.highlightAll();</script>
            </head>
            <body class="bg-gray-100">
              <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold mb-4 pb-2 border-b">${filePath}</h1>
                <pre class="bg-white p-4 rounded-lg shadow"><code class="language-${extension}">${escapeHtml(
                    content
                )}</code></pre>
              </div>
            </body>
            </html>
          `;

                const outputPath = path.join(outputDir, `${filePath}.html`);
                await fs.mkdir(path.dirname(outputPath), { recursive: true });
                await fs.writeFile(outputPath, htmlContent);

                fileLinks.push({ path: filePath, type: getFileType(filePath) });
                console.log(`Generated HTML for: ${filePath}`);
            }
        }

        fileLinks.sort((a, b) => a.path.localeCompare(b.path));

        const repoName = path.basename(repoPath);

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
          <div class="bg-white rounded-lg shadow">
           <ul class="divide-y divide-gray-200">
              ${fileLinks
                  .map(
                      (file) => `
                <li>
                  <a href="${file.path}.html" class="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors duration-150">
                    <i data-lucide="${file.type}" class="mr-3 text-gray-500"></i>
                    <span class="text-blue-600 hover:underline">${file.path}</span>
                  </a>
                </li>
              `
                  )
                  .join('')}
            </ul>
          </div>
        </div>
        <script>
          lucide.createIcons();
        </script>
      </body>
      </html>
    `;

        await fs.writeFile(path.join(outputDir, 'index.html'), indexContent);
        console.log('Generated index.html');

        console.log('HTML generation complete!');
    } catch (error) {
        console.error('Error:', error);
    }
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

generateHtmlFiles();

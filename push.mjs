import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BUCKET_NAME = 'garyjennings-git';

async function zipDirectory(sourceDir, outPath) {
    try {
        await execAsync(`zip -r ${outPath} .`);
        console.log('Repository zipped successfully');
    } catch (error) {
        console.error('Error zipping repository:', error);
        throw error;
    }
}

async function uploadToS3(filePath, key) {
    try {
        await execAsync(`aws s3 cp ${filePath} s3://${BUCKET_NAME}/${key}`);
        console.log('Upload to S3 successful');
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
}

async function main() {
    const repoPath = '.';
    const zipPath = 'repo.zip';
    const currentDirName = path.basename(process.cwd());
    const s3Key = `${currentDirName}/repo.zip`;

    console.log(`Pushing repository: ${currentDirName}`);
    console.log('Zipping repository...');
    await zipDirectory(repoPath, zipPath);

    console.log('Uploading to S3...');
    await uploadToS3(zipPath, s3Key);

    console.log('Cleaning up...');
    await fs.unlink(zipPath);

    console.log('Push to S3 complete!');
}

main().catch(console.error);

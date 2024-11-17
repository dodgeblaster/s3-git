import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const BUCKET_NAME = process.env.GIT_BUCKET_NAME;

async function downloadFromS3(key, filePath) {
    try {
        await execAsync(`aws s3 cp s3://${BUCKET_NAME}/${key} ${filePath}`);
        console.log('Download from S3 successful');
    } catch (error) {
        console.error('Error downloading from S3:', error);
        throw error;
    }
}

async function unzipFile(zipPath, targetDir) {
    try {
        await execAsync(`unzip -o ${zipPath} -d ${targetDir}`);
        console.log('Zip file extracted successfully');
    } catch (error) {
        console.error('Error extracting zip file:', error);
        throw error;
    }
}

async function main() {
    const currentDirName = path.basename(process.cwd());
    const s3Key = `${currentDirName}/repo.zip`;
    const zipPath = 'repo.zip';
    const extractPath = '.';

    console.log(`Pulling repository: ${currentDirName}`);
    console.log('Downloading from S3...');
    await downloadFromS3(s3Key, zipPath);

    console.log('Extracting zip file...');
    await unzipFile(zipPath, extractPath);

    console.log('Cleaning up...');
    await fs.unlink(zipPath);

    console.log('Pull from S3 complete!');
}

main().catch(console.error);

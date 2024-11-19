# S3 Git

This is a project for storing your git repos on s3. It also generates html files for all repo's and all files in that repo.

## Usage

### Pull

This will take the name of the folder you are in as the name of the git repo, and try
to pull that repo from your s3 bucket

```bash
GIT_BUCKET_NAME=MY_BUCKET node pull.mjs
```

### Push

This will take the name of the folder you are in as the name of the git repo, and try
to push that repo to your s3 bucket

```bash
GIT_BUCKET_NAME=MY_BUCKET node push.mjs
```

### Generate All

This will read all repos on your S3 bucket, and generate HTML pages for all the repos and files in each repo.
The purpose of this is to deploy this as a "simple public gthub". Obviously these will be static files so it
is "read only" git projects.

```bash
GIT_BUCKET_NAME=MY_BUCKET node generateAll.mjs
```

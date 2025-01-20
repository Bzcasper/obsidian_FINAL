# AWS Lambda Deployment Guide

## Prerequisites

1. Install AWS CLI
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

2. Configure AWS Credentials
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

## Deployment Steps

1. Build the application:
```bash
npm run build
```

2. Deploy to AWS Lambda:
```bash
npm run deploy
```

This will:
- Package your application
- Create/update Lambda functions
- Set up API Gateway
- Configure environment variables

## Environment Variables

Ensure these environment variables are set in AWS Lambda:

```
SUPABASE_URL=https://wnfrkuzztkmroyyikcxg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SCRAPER_TIMEOUT=30000
SCRAPER_USER_AGENT=Mozilla/5.0 (compatible; ContentAutomationBot/1.0)
SCRAPER_MAX_RETRIES=3
```

## Function Configuration

The deployment creates three main Lambda functions:

1. `scraper` - Handles web content scraping
2. `automation` - Manages content automation tasks
3. `trends` - Processes trending topics

## Monitoring

Monitor your functions using:
```bash
# View logs
aws logs get-log-events --log-group-name /aws/lambda/obsidian-web-clipper-dev-scraper

# View metrics
aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Invocations --dimensions Name=FunctionName,Value=obsidian-web-clipper-dev-scraper
```

## Troubleshooting

1. If deployment fails:
   - Check AWS credentials
   - Verify IAM permissions
   - Check Lambda function logs

2. If function times out:
   - Increase timeout in serverless.yml
   - Optimize function code
   - Consider breaking into smaller functions

3. If memory issues occur:
   - Increase memory allocation
   - Optimize image processing
   - Implement better memory management
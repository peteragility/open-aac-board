#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

AAC_REGION="${AAC_REGION:-ap-east-1}"
AAC_STACK="${AAC_STACK:-open-aac-board}"
export AWS_PAGER=""
if [[ "$AAC_REGION" != "ap-east-1" ]]; then
  echo 'This deployment is restricted to the requested Hong Kong region (ap-east-1).' >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Commit the source first so the downloadable GPL source matches the release.' >&2
  exit 1
fi
aws sts get-caller-identity --region "$AAC_REGION" --query Arn --output text
if [[ ! -d node_modules ]]; then
  echo 'Dependencies are missing. Run npm ci first.' >&2
  exit 1
fi
npm run test:local
GENERATE_SOURCEMAP=false npm run build
npm run test:web
mkdir -p build/source
git archive --format=tar.gz --prefix=open-aac-board/ HEAD > build/source/open-aac-board-source.tar.gz
cp LICENSE.txt build/LICENSE.txt
aws cloudformation validate-template --template-body file://infrastructure/hosting.json --region "$AAC_REGION" >/dev/null
aws cloudformation deploy --template-file infrastructure/hosting.json --stack-name "$AAC_STACK" --region "$AAC_REGION" --no-fail-on-empty-changeset --tags Project=open-aac-board
AAC_BUCKET="$(aws cloudformation describe-stacks --stack-name "$AAC_STACK" --region "$AAC_REGION" --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' --output text)"
AAC_DISTRIBUTION="$(aws cloudformation describe-stacks --stack-name "$AAC_STACK" --region "$AAC_REGION" --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)"
AAC_URL="$(aws cloudformation describe-stacks --stack-name "$AAC_STACK" --region "$AAC_REGION" --query 'Stacks[0].Outputs[?OutputKey==`AppUrl`].OutputValue' --output text)"
# Upload assets before HTML. Keep older assets for open tabs during updates.
aws s3 sync build/ "s3://$AAC_BUCKET/" --region "$AAC_REGION" --exclude 'static/*' --exclude '*.html' --exclude 'service-worker.js' --cache-control 'public,max-age=3600' --only-show-errors
aws s3 sync build/static/ "s3://$AAC_BUCKET/static/" --region "$AAC_REGION" --cache-control 'public,max-age=31536000,immutable' --only-show-errors
aws s3 cp build/service-worker.js "s3://$AAC_BUCKET/service-worker.js" --region "$AAC_REGION" --cache-control 'no-cache,no-store,must-revalidate' --content-type 'application/javascript' --only-show-errors
aws s3 cp build/index.html "s3://$AAC_BUCKET/index.html" --region "$AAC_REGION" --cache-control 'no-cache,no-store,must-revalidate' --content-type 'text/html' --only-show-errors
aws cloudfront create-invalidation --distribution-id "$AAC_DISTRIBUTION" --paths '/*' --query 'Invalidation.Id' --output text
printf 'App: %s\nSource: %s/source/open-aac-board-source.tar.gz\n' "$AAC_URL" "$AAC_URL"

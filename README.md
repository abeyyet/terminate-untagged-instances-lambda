## Introduction

This project provides a function that can be executed in [AWS Lambda](https://aws.amazon.com/lambda/) to terminate all un-tagged EC2 instances.  Originally developed as a cost-saving measure, and meant to be executed on a regular schedule (e.g. every 10 minutes).

Ideally, these un-tagged instances would never be created in the first place; there would be an IAM policy that simply prevents it.  If there's a way to do this, let me know!  In the meantime, however, I decided to treat this as a self-given coding exercise :-).

## Usage

The Node.js script can be executed in two ways:  as a stand-alone utility, or via AWS Lambda.

### Command line

When running on the command line, the script accepts a single parameter, `--standalone`.  All AWS configuration is assumed to be **external** to the script.  See [Amazon documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html) for details about how the AWS client searches for config.

    $ node lambda-function.js --standalone

### Lambda

Before running in Lambda, the function must be created, e.g. using the AWS Console.  Once it exists, you can upload the content using the `Makefile`.  You'll need to set the following variables:

* `LAMBDA_PROFILE` - the name of the local AWS configuration profile
* `LAMBDA_FUNCTION` - the name of the previously-created AWS Lambda function

Example:

    $ LAMBDA_PROFILE=my-aws-profile LAMBDA_FUNCTION=my-lambda-func make publish

## Notifications

The script will send a notification to [Amazon SNS](https://aws.amazon.com/sns/) if configured properly, and if any EC2 instances are terminated.  To configure SNS, create a file called `props.json` in the same directory as the script, with the following content:

    {
      "sns":
      {
        "topicArn": "foo"
      }
    }

where `foo` is an actual SNS topic ARN, e.g. `arn:aws:sns:us-west-2:123456789012:terminate-untagged-instances`.

This file will automatically be included in the ZIP file when built for Lambda using `make`.

Lambda.zip: lambda-function.js props.json
	zip -r Lambda lambda-function.js props.json node_modules --exclude=*aws-sdk*

lambda: Lambda.zip

all: lambda

clean:
	rm Lambda.zip

publish: all
ifndef LAMBDA_PROFILE
	echo LAMBDA_PROFILE must be set to valid AWS CLI profile name.
	exit 1
endif
ifndef LAMBDA_FUNCTION
	echo LAMBDA_FUNCTION must be set to valid AWS Lambda function name.
	exit 1
endif
	aws --profile $(LAMBDA_PROFILE) lambda update-function-code --function-name $(LAMBDA_FUNCTION) --zip-file fileb://Lambda.zip

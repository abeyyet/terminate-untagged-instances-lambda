// Work in progress.
// The idea is to iterate through each region, get the list of instances, identify any with no tags whatsoever, and terminate them.
// Next step after that would be to send an SNS notification with the list of instance IDs (one notification per region).

var aws = require('aws-sdk');
var https = require('https');
var url = require('url');

var checkAllRegions = function(event, context) {
    if (event) {
        console.log('Received event:', JSON.stringify(event, null, 2));
    }

    var ec2 = new aws.EC2();
    ec2.describeRegions({}, function(err, data) {
        if (err) {
            handleFailure(err, context);
        } else {
            data.Regions.forEach(function(region) {
                checkRegion(region.RegionName, context);
            });
        }
    });
}

var checkRegion = function(regionName, context) {
    console.log("Processing region: " + regionName);

    var ec2 = new aws.EC2({
        "region": regionName
    });

    ec2.describeInstances({}, function(err, data) {
        if (err) {
            handleFailure(err, context);
        } else {
            data.Reservations.forEach(function(reservation) {
                reservation.Instances.forEach(function(instance) {
                    var instanceId = instance.InstanceId;

                    if (instance.State.Name === "running" && instance.Tags.length === 0) {
                        console.log("Instance " + instanceId + " (" + regionName + ") has no tags.");
                    }
                })
            });
        }
    });
}

var handleFailure = function(err, context) {
    if (context) {
        // We have a Lambda context; invoke the official "failure" method.
        context.fail(err);
    } else {
        // We don't have a Lambda context; assume we're running in standalone mode.
        console.error(err);
        process.exit(1);
    }
}

// Expose the Lambda endpoint.
exports.handler = checkAllRegions;

// If we're running in standalone mode (i.e. outside of Lambda), then execute now.
if (process && process.argv && process.argv.length === 3 && process.argv[2] === "--standalone") {
    checkAllRegions();
}

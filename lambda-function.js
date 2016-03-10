var awsPromised = require('aws-promised');

var checkAllRegions = function(event, context) {
    // We'll have an event object if being called from Lambda.
    // In our case, nothing interesting will be in it, but log it just the same.
    if (event) {
        console.log('Received event:', JSON.stringify(event, null, 2));
    }

    // Create the promisified EC2 client.  We're assuming that credentials
    // are handled outside this script, e.g. "~/.aws/credentials" file and/or
    // environment variables.
    var ec2 = awsPromised.ec2();

    // We have to iterate through the list of regions and check each independently.
    ec2.describeRegionsPromised()
        .then(function(data) {
            // Create a list of all the region-specific promises.
            var checkRegionPromises = [];

            // Start/create a promise for each region.
            data.Regions.forEach(function(region) {
                checkRegionPromises.push(checkRegionPromised(region.RegionName, context));
            });

            // Get 'em done!
            return Promise.all(checkRegionPromises);
        }).then(function() {
            console.log("All done!");
        }).catch(function(err) {
            handleFailure(err, context);
        });
}

var checkRegionPromised = function(regionName, context) {
    console.log("Processing region: " + regionName);

    // Create a new promisified EC2 client for this specific region.
    var ec2 = new awsPromised.ec2({
        "region": regionName
    });

    // Get a list of all instances.  It would be nice if we could filter the API
    // results to just un-tagged instances, but I couldn't find a way to do it (you
    // can filter to specific tag values, but that's not the same thing).
    return ec2.describeInstancesPromised()
        .then(function(data) {
            var untaggedInstanceIds = [];

            // Iterate through the list, and find the un-tagged ones (if any).
            data.Reservations.forEach(function(reservation) {
                reservation.Instances.forEach(function(instance) {
                    var instanceId = instance.InstanceId;

                    // For now, we only check "running" instances.  We could check "pending"
                    // as well, but this way the culprit still gets a few minutes to add tags,
                    // if they're quick enough :-).
                    if (instance.State.Name === "running" && instance.Tags.length === 0) {
                        console.log("Instance " + instanceId + " (" + regionName + ") has no tags.");
                        untaggedInstanceIds.push(instanceId);
                    }
                })
            });

            // If we found any un-tagged instances, then terminate them.
            if (untaggedInstanceIds.length > 0) {
                console.log("Terminating " + untaggedInstanceIds.length + " instance(s) in " + regionName);

                return ec2.terminateInstancesPromised({ "InstanceIds": untaggedInstanceIds })
                    .then(function() {
                        console.log("Successfully terminated " + untaggedInstanceIds.length + " instance(s) in " + regionName);
                    });
            }
        }).then(function() {
            console.log("Finished processing region: " + regionName);
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

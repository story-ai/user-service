"use strict";

const afterUpdate = (serverless, options) => {
	const stage = options.stage || serverless.service.provider.stage;
	const region = options.region || serverless.service.provider.region;
	const aws = serverless.getProvider("aws");
	const apiName =
		serverless.service.resources.Resources.ApiGatewayRestApi.Properties
			.Name;

	serverless.cli.log("Fetching API Gateway ID...");
	return aws
		.request("APIGateway", "getRestApis", {
			limit: 500,
		})
		.then(apis => {
			console.log("Seeking ", apiName);
			const api = apis.items.find(entry => entry.name === apiName);
			if (api !== undefined) {
				return api.id;
			}
			throw Error("Could not find API");
		})
		.then(id => {
			serverless.cli.log("Fetching OpenAPI spec...");
			return aws.request("APIGateway", "getExport", {
				exportType: "swagger",
				restApiId: id,
				stageName: stage,
				accepts: "application/json",
			});
		})
		.then(result => {
			serverless.cli.log("Uploading spec to S3...");
			const spec = JSON.parse(result.body);

			// remove OPTIONS endpoints - these don't need documenting
			for (let path in spec.paths) {
				if (spec.paths[path].options) delete spec.paths[path].options;
			}

			// add description for the spec endpoint
			// TODO: I want this in the yaml, but if I put it in docs.yaml, it gets ignored; if I put it in as a CloudFormation resource, it gets overwritten by the serverless docs plugin
			console.log(spec.paths["/spec"]);
			spec.paths["/spec"].get.summary = "Retrieve this API specification";

			return aws.request(
				"S3",
				"putObject",
				{
					ACL: "public-read",
					Bucket: serverless.service.custom.spec_bucket,
					Body: JSON.stringify(spec),
					ContentType: "application/json",
					Key: serverless.service.service + ".json",
				},
				stage,
				region
			);
		})
		.then(_ => {
			serverless.cli.log("Upload complete");
		});
};

module.exports = class {
	constructor(serverless, options) {
		this.hooks = {
			"after:deploy:deploy": afterUpdate.bind(null, serverless, options),
		};
	}
};

"use strict";

const afterUpdate = (serverless, options) => {
	const stage = options.stage || serverless.service.provider.stage;
	const region = options.region || serverless.service.provider.region;
	const aws = serverless.getProvider("aws");
	const apiName = aws.naming.getApiGatewayName();

	serverless.cli.log("Fetching API Gateway ID...");
	return aws
		.request("APIGateway", "getRestApis", {
			limit: 500,
		})
		.then(apis => {
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

			return aws.request(
				"S3",
				"putObject",
				{
					ACL: "public-read",
					Bucket: serverless.service.custom.spec_bucket,
					Body: result.body,
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

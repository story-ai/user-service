import { APIGateway } from "aws-sdk";
import { Handler, APIGatewayEvent, Callback } from "aws-lambda";
import * as Boom from "boom";

import { finish } from "../utils";
import { API_GATEWAY_NAME, API_GATEWAY_STAGE, AWS_REGION } from "../config";

const apiGateway = new APIGateway({ region: AWS_REGION });
const Result = Promise;

export function index(e: APIGatewayEvent, ctx: any, done: Callback) {
	finish(done, async () => {
		console.log(process.env.AWS_PROFILE);
		const req = JSON.parse(e.body || "{}");

		const apis = await apiGateway.getRestApis().promise();
		if (apis.items === undefined)
			throw Boom.notFound("Could not find any API Gateway RestApis");

		console.log(apis);
		const api = apis.items.find(api => api.name === API_GATEWAY_NAME);
		if (api === undefined) {
			throw Boom.notFound(
				"Could not find any API Gateway RestApis called " +
					API_GATEWAY_NAME
			);
		}

		const id = api.id;
		if (id === undefined) {
			throw Boom.internal("Could not obtain api ID");
		}

		const spec = await apiGateway
			.getExport(
				{
					restApiId: id,
					stageName: API_GATEWAY_STAGE,
					exportType: "swagger",
					accepts: "application/json",
				},
				undefined
			)
			.promise();

		if (spec.body === undefined)
			throw Boom.internal("Could not obtain api ID");

		return {
			result: JSON.parse(spec.body.toString()),
			headers: { "Content-Type": "application/json" },
			statusCode: 200,
		};
	});
}

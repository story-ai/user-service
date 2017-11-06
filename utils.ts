import { Result } from "./types";
import { boomify, BoomError } from "boom";

const cors = {
	"Access-Control-Allow-Origin": "*",
};

export async function finish(
	callback: AWSLambda.Callback,
	resulter: () => Result
) {
	let output;
	try {
		const res = await resulter();
		output = {
			statusCode: res.statusCode || 200,
			body: JSON.stringify(res.result),
			headers: Object.assign({}, cors),
		};
	} catch (e) {
		let b: BoomError;
		if (e.isBoom) {
			b = e;
		} else {
			console.error(e);
			b = boomify(e);
		}

		output = {
			statusCode: b.output.statusCode,
			headers: Object.assign({}, cors, b.output.headers),
			body: JSON.stringify(b.output.payload),
		};
	}
	return callback(null, output);
}

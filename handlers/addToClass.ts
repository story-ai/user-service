import { fetchToken } from "./auth";
import fetch from "node-fetch";
import { Handler, APIGatewayEvent } from "aws-lambda";
import axios from "axios";

import { Result, serialiseLambda } from "story-backend-utils";
import { CENTURY_ORG_ID, CLASS_CODE, SENDGRID_API_KEY } from "../config";
import { CenturyTypes } from "story-backend-utils";

export function index(e: APIGatewayEvent, ctx: any, done = () => {}) {
  const req = JSON.parse(e.body || "{}");
  serialiseLambda(done, () =>
    simpleHandler(e.pathParameters.userId, req.classId)
  );
}

const Result = Promise;

async function simpleHandler(
  userId: string,
  classId: string
): Result<{ success: boolean; message?: string }> {
  try {
    if (userId === undefined || userId.length < 1) throw "User ID invalid";
    if (classId === undefined || classId.length < 1) throw "Class ID invalid";
    const token = await fetchToken();

    // get the user object we are going to modify
    let userResult = await axios.get<CenturyTypes.User>(
      `https://api.century.tech/accounts/v2/users/${userId}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        }
      }
    );
    if (userResult.status !== 200) {
      throw userResult.statusText;
    }

    const user: CenturyTypes.User = {
      ...userResult.data,
      profile: {
        ...userResult.data.profile,
        groups: {
          ...userResult.data.profile.groups,
          organisations: userResult.data.profile.groups.organisations.map(
            o =>
              o.organisation === CENTURY_ORG_ID
                ? {
                    ...o,
                    classes: o.classes.concat([classId]),
                    classSettings: o.classSettings.concat([{ class: classId }])
                  }
                : o
          )
        }
      }
    };

    let update = await axios.patch<{ id: string }>(
      `https://api.century.tech/accounts/v2/users/${userId}`,
      user,
      {
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        }
      }
    );

    console.log(update);
    return { result: { success: true }, statusCode: 200 };
  } catch (e) {
    return {
      result: { success: false, message: e },
      statusCode: 500
    };
  }
}

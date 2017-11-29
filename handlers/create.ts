import { fetchToken } from "./auth";
import fetch from "node-fetch";
import sgMail = require("@sendgrid/mail");
import randomize = require("randomatic");
import { Handler, APIGatewayEvent } from "aws-lambda";
import * as Boom from "boom";
import axios from "axios";

import { Result, serialiseLambda } from "story-backend-utils";
import { CENTURY_ORG_ID, CLASS_CODE, SENDGRID_API_KEY } from "../config";

const Result = Promise;
sgMail.setApiKey(SENDGRID_API_KEY);

export function index(e: APIGatewayEvent, ctx: any, done = () => {}) {
  const req = JSON.parse(e.body || "{}");
  serialiseLambda(done, () =>
    simpleHandler(req.username, req.password, req.passwordConfirmation)
  );
}

function generate_password() {
  return randomize("a0", 10);
}

async function simpleHandler(
  username: string,
  password: string,
  passwordConfirmation: string
): Result<{ success: boolean; message?: string }> {
  try {
    console.log(username, password, passwordConfirmation);
    // basic validation
    if (username === undefined || username.length < 1) {
      return {
        result: { success: false, message: "Email must be provided" },
        statusCode: 400
      };
    }
    if (username.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i) === null) {
      return {
        result: { success: false, message: "Email format is invalid" },
        statusCode: 400
      };
    }
    if (password === undefined || password.length < 1) {
      return {
        result: { success: false, message: "Password must not be empty" },
        statusCode: 400
      };
    }
    if (passwordConfirmation !== password) {
      return {
        result: { success: false, message: "Password confirmation must match" },
        statusCode: 400
      };
    }

    // check if the user has already registered with Century
    let check = await axios.get<{ isKnownUser: boolean }>(
      `https://app.century.tech/learn/api/users?email=${username}`,
      {
        headers: {
          "Content-Type": "application/javascript"
        }
      }
    );
    if (check.data.isKnownUser) {
      return {
        result: {
          success: false,
          message: "This email has already been registered"
        },
        statusCode: 400
      };
    }

    // prepare a user object to register
    const token = await fetchToken();

    let register = await axios.post<{ id: string }>(
      "https://api.century.tech/accounts/v2/users/",
      {
        password,
        personal: { name: { first: "Story", last: "User" } },

        contact: {
          emails: [
            {
              address: username,
              isVerified: false
            }
          ]
        },
        profile: {
          groups: {
            organisations: [
              {
                organisation: "0adee573-b3e3-46cf-a16b-32980590e2fe",
                roles: ["learner", "student"]
              }
            ]
          },
          ids: { username }
        }
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        }
      }
    );

    console.log(register);
    return { result: { success: true }, statusCode: 200 };
  } catch (e) {
    return {
      result: { success: false, message: e.response.data.message },
      statusCode: 500
    };
  }
}

// async function handler(
//   email?: string,
//   first_name?: string,
//   last_name?: string
// ): Result<{ _id: string }> {
//   // validate inputs
//   if (
//     typeof email === "undefined" ||
//     email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i) === null
//   )
//     throw Boom.badData("Email format is invalid");
//   if (typeof first_name === "undefined" || first_name.length <= 0)
//     throw Boom.badData("First name format is invalid");
//   if (typeof last_name === "undefined" || last_name.length <= 0)
//     throw Boom.badData("Last name format is invalid");

//   // check that the user has not previously registered with CENTURY
//   let result = await fetch(`${CENTURY_API_BASE}/users?email=${email}`);
//   if (result.status > 299) throw new Error(await result.text());
//   const { isKnownUser } = await result.json();

//   if (isKnownUser) {
//     throw Boom.conflict(
//       "This email address is already associated with a user."
//     );
//   }

//   // generate a new password for this user
//   const password = generate_password();

//   // prepare a user object to submit to CENTURY
//   const user = {
//     password,
//     personal: {
//       name: {
//         first: first_name,
//         last: last_name
//       },
//       birthDate: "2000-01-01T00:00:00.000Z",
//       gender: "female",
//       ethnicity: {
//         sdeCode: "NS"
//       }
//     },
//     contact: {
//       emails: [
//         {
//           address: email,
//           isVerified: true
//         }
//       ]
//     }
//   };

//   // email the user to notify him of his new password, and telling him where to log in
//   const msg = {
//     to: email,
//     from: "admin@axontoken.com",
//     subject: "Your Story demo credentials",
//     text: `Thank you for signing up to Story.
// 		You can log in at https://app.century.tech with these credentials:

// 		Email: ${email}
// 		Password: ${password}

// 		You will be able to change your password after you have logged in.
// 		`,

//     html: `<p>Thank you for signing up to Story. </p>
// 		<p>You can log in at <a href="https://app.century.tech">https://app.century.tech</a>
// 		with these credentials:</p>

// 		<p>
// 		Email: <b>${email}</b><br/>
// 		Password: <b>${password}</b>
// 		</p>
// 		<p>You will be able to change your password after you have logged in.</p>
// 		`
//   };

//   const sgResult = await sgMail.send(msg);

//   // submit the request to CENTURY
//   result = await fetch(`${CENTURY_API_BASE}/users?code=${CLASS_CODE}`, {
//     method: "POST",
//     body: JSON.stringify(user),
//     headers: { "Content-Type": "application/json" }
//   });
//   if (result.status > 299) throw new Error(await result.text());
//   const { _id } = await result.json();

//   // return something to the client
//   return {
//     result: { _id },
//     statusCode: 200
//   };
// }

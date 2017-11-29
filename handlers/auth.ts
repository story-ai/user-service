import fetch from "node-fetch";
import jwt_decode = require("jwt-decode");
import axios from "axios";

import { CENTURY_ADMIN_EMAIL, CENTURY_ADMIN_PASSWORD } from "../config";

let token: string | null = null;
let expiry: Date | null = null;

export const fetchToken: () => Promise<string> = () => {
  console.log(CENTURY_ADMIN_EMAIL);
  return axios
    .post<{ token: string }>(
      "https://api.century.tech/accounts/v2/login-sessions",
      {
        email: CENTURY_ADMIN_EMAIL,
        password: CENTURY_ADMIN_PASSWORD
      },
      {
        headers: { "content-type": "application/json" }
      }
    )
    .then(json => {
      token = json.data.token;
      const decoded = jwt_decode<{ exp: number }>(token);
      expiry = new Date(1000 * decoded.exp);
      return token;
    });
};

export const getToken: () => Promise<string> = () => {
  if (token === null || expiry === null || expiry <= new Date()) {
    return fetchToken();
  }
  console.log("fetched from cache");
  return Promise.resolve(token);
};

export const invalidateToken = () => {
  token = null;
  expiry = null;
};

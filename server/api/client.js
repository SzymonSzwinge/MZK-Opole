const axios = require("axios");

const BASE_URL = "https://dip.mzkopole.pl";

async function fetchJson(path) {
    const res = await axios.get(`${BASE_URL}${path}`, {
        headers: { Accept: "application/json" },
    });
    return res.data;
}

module.exports = { fetchJson, BASE_URL };
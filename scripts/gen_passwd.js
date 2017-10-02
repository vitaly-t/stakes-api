#!/usr/bin/env node
var scrypt = require('scrypt');
var pr = scrypt.paramsSync(0.2);
var hash = scrypt.kdfSync(process.argv[2], pr).toString("base64");
console.log(hash);

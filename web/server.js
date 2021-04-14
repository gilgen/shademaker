const express = require('express');
const bodyParser = require('body-parser');
// const i2c = require('i2c-bus');
const { exec } = require("child_process");
// const I2C_BUS = 1;
// const ADDR = 0B10010;

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
});

app.get('/api/blinds', (req, res) => {
  exec(`/usr/bin/python ../get_blind_states.py`, (err, stdout, stderr) => {
    if (stderr) { console.error(stderr); }
    // stdout is expected to be JSON in the format:
    // { 1: { set: 60, cur: 20 }, 2: { set: 50, cur: 30 }, ...
    console.log(stdout);
    res.send(stdout);
  });
});

app.put('/api/blinds', (req, res) => {
  console.log(req.body);
  let command = req.body.post;
  exec(`/usr/bin/python ../send_cmd.py ${command}`, (err, stdout, stderr) => {
    if (stderr) { console.error(stderr); }
    res.send(
      `I received your POST request. This is what I set the blinds to: ${command}`,
    );
  });
});

app.listen(port, () => console.log(`Listening on port ${port}`));

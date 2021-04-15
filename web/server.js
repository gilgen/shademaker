const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require("child_process");

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/blinds', (req, res) => {
  exec(`/usr/bin/python ../bin/get_blind_states.py`, (err, stdout, stderr) => {
    if (stderr) { console.error(stderr); }
    // console.log("Received blind states: ", stdout);
    res.send(stdout);
  });
});

app.put('/api/blinds', (req, res) => {
  console.log(req.body);
  let blinds = req.body.blinds;
  let command = req.body.command;
  exec(`/usr/bin/python ../bin/send_blind_command.py ${blinds} ${command}`, (err, stdout, stderr) => {
    if (stderr) { console.error(stderr); }
    res.send(
      `Update request successfully sent: ${command}`,
    );
  });
});

app.listen(port, () => console.log(`Listening on port ${port}`));

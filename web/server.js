const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require("child_process");
const fs = require('fs');

const app = express();
const port = (process.env.PORT || 5000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/blinds', (req, res) => {
  exec(`../bin/get_blind_states.py`, (err, stdout, stderr) => {
    if (stderr) { console.error(stderr); }
    // console.log("Received blind states: ", stdout);
    res.send(stdout);
  });
});

app.put('/api/blinds', (req, res) => {
  console.log(req.body);
  let blinds = req.body.blinds;
  let command = req.body.command;
  exec(`../bin/send_blind_command.py ${blinds} ${command}`, (err, stdout, stderr) => {
    if (stderr) { console.error(stderr); }
    res.send(
      `Update request successfully sent: ${command}`,
    );
  });
});

app.put('/api/auto_sensors/:id', (req, res) => {
  let sensor = req.params.id;
  let value = req.body.is_enabled;
  let autoSensorFile = "../bin/.auto-states"
  fs.readFile(autoSensorFile, 'utf8', (err, jsonStr) => {
    let json = JSON.parse(jsonStr);
    json[sensor]['isEnabled'] = value;
    fs.writeFile(autoSensorFile, JSON.stringify(json), function (err) {
      if (err) return console.log(err);
      console.log(`Updated ${autoSensorFile} file`);
      res.send(`Updated!`);
    });
  });
});

app.listen(port, () => console.log(`Listening on port ${port}`));

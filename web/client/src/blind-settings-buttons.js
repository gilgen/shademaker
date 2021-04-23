import React, { Component } from 'react';
import { Slider } from '@material-ui/core';
import { withStyles } from "@material-ui/core/styles";
import Snackbar from '@material-ui/core/Snackbar';
import Switch from '@material-ui/core/Switch';
import { sendCommand } from './blind-functions';

import IconButton from '@material-ui/core/IconButton';
import UpIcon from '@material-ui/icons/ArrowUpward';
import DownIcon from '@material-ui/icons/ArrowDownward';
import StopIcon from '@material-ui/icons/Stop';
import SaveIcon from '@material-ui/icons/Save';

class BlindsetSlider extends Component {

  constructor(props) {
    super(props);
    this.up = this.up.bind(this);
    this.down = this.down.bind(this);
    this.store = this.store.bind(this);
    this.stop = this.stop.bind(this);
  }

  up() {
    console.log("Up: ", this.props.blindNumber);
    sendCommand(this.props.blindNumber, 0);
  }

  down() {
    console.log("Down: ", this.props.blindNumber);
    sendCommand(this.props.blindNumber, 102);
  }

  stop() {
    console.log("Stop: ", this.props.blindNumber);
    sendCommand(this.props.blindNumber, 101);
  }

  store() {
    console.log("Store: ", this.props.blindNumber);
    if(confirm("Store the current position as the bottom position?")) {
      sendCommand(this.props.blindNumber, 103);
    }
  }

  render() {
    return <li className="blind-settings-buttons-container">
      <div className="blindset-name">#{this.props.blindNumber}</div>
      <IconButton className="settings-button" fontSize="small" onClick={this.up} aria-label="up" size="small">
        <UpIcon />
      </IconButton>
      <IconButton className="settings-button" fontSize="small" onClick={this.down} aria-label="up" size="small">
        <DownIcon />
      </IconButton>
      <IconButton className="settings-button" fontSize="small" onClick={this.stop} aria-label="up" size="small">
        <StopIcon />
      </IconButton>
      <IconButton className="settings-button" fontSize="small" onClick={this.store} aria-label="up" size="small">
        <SaveIcon />
      </IconButton>
    </li>
  }

}

export default BlindsetSlider;

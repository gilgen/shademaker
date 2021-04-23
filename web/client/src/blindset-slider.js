import React, { Component } from 'react';
import { Slider } from '@material-ui/core';
import { withStyles } from "@material-ui/core/styles";
import Snackbar from '@material-ui/core/Snackbar';
import Switch from '@material-ui/core/Switch';
import { sendCommand } from './blind-functions';

// If you want the auto labelling, uncomment these
// import FormGroup from '@material-ui/core/FormGroup';
// import FormControlLabel from '@material-ui/core/FormControlLabel';

const CurrentHeightSlider = withStyles({
  thumb: {
    height: 0,
    width: 0,
    display: 'none'
  },
  track: {
    width: "8px !important",
  },
  rail: {
    width: "8px !important"
  }
})(Slider);

const SetpointSlider = withStyles({
  root: {
    color: '#52af77',
  },
  thumb: {
    height: 25,
    width: 25,
    backgroundColor: '#fff',
    border: '2px solid currentColor',
    marginTop: -8,
    marginLeft: "-9px !important",
    '&:focus, &:hover, &$active': {
      boxShadow: 'inherit',
    },
  },
  active: {},
  track: {
    width: "5px !important",
    borderRadius: "4px",
  },
  rail: {
    width: "5px !important",
    borderRadius: "4px",
  },
})(Slider);

class BlindsetSlider extends Component {

  state = {
    blindsetName: '',
    blindNums: [],
    blindStates: {},
    autoStates: {},
    setHeight: 100,
    isMovingSetSlider: false,
    autoEnabled: false,
    autoSwitchNotificationVisible: false
  }

  constructor(props) {
    super(props);
    this.toggleAuto = this.toggleAuto.bind(this);
    this.currentHeight = this.currentHeight.bind(this);
  }

  componentDidMount() {
    this.tick();
    this.interval = setInterval(this.tick, 1000);
    let firstActiveBlindState = this.getFirstActiveBlindState();
    if (firstActiveBlindState) {
      this.setState({ setHeight: 100-firstActiveBlindState.set });
    }
  }

  componentWillUnmount() {
    if(this.interval) {
      clearInterval(this.interval);
    }
  }

  tick = () => {
    // Update the blind heights with data from the server
    let firstActiveBlindState = this.getFirstActiveBlindState();
    if (firstActiveBlindState && !this.state.isMovingSetSlider) {
      this.setState({ setHeight: 100-firstActiveBlindState.set });
    }

    // Update the auto states with data from the server
    if (Number.isInteger(this.props.autoSensor)) {
      this.setState({
        autoEnabled: this.props.autoStates[this.props.autoSensor]['isEnabled']
      });
    }
  }

  getFirstActiveBlindState() {
    let firstActiveBlindState;
    this.props.blindNums.find((n) => {
      if (this.props.blindStates[n].cur !== "unreachable") {
        firstActiveBlindState = this.props.blindStates[n];
        return true;
      }
      return false;
    });
    return firstActiveBlindState;
  }

  setSliderChanged = (e, newVal) => {
    e.preventDefault();
    this.setState({ setHeight: newVal, isMovingSetSlider: true });
  }

  handleSliderCommit = (event, newValue) => {
    sendCommand(this.props.blindNums, 100-newValue);
    setTimeout(() => {
      this.setState({ isMovingSetSlider: false });
    }, 1500);
  }

  toggleAuto() {
    let newAutoState = !this.state.autoEnabled;
    this.setState({  autoEnabled: newAutoState });
    console.log(`Updating auto state for ${this.props.autoSensor} to ${newAutoState}`);
    fetch(`/api/auto_sensors/${this.props.autoSensor}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({ is_enabled: newAutoState }),
    }).then((response) => {
      console.log("Successfully set the auto state");
      this.setState({ autoSwitchNotificationVisible: true });
    });
  }

  autoToggleMarkup() {
    if (Number.isInteger(this.props.autoSensor)) {
      // autoToggleMarkup = <FormGroup>
      //   <FormControlLabel
      //     control={<Switch checked={this.state.autoEnabled} onChange={toggleAuto} />}
      //     label="Auto"
      //     labelPlacement="bottom"
      //   />
      // </FormGroup>
      return <Switch checked={this.state.autoEnabled} onChange={this.toggleAuto} />
    } else {
      return '';
    }
  }

  currentHeight() {
    let firstActiveBlindstate = this.getFirstActiveBlindState();
    if (firstActiveBlindstate) {
       return 100-firstActiveBlindstate.cur;
    } else {
      return 100;
    }
  }

  render() {
    return (
      <li className="blind-height-indicator">
        <div className="sliders">
          <SetpointSlider
            onChange={this.setSliderChanged}
            value={this.state.setHeight}
            onChangeCommitted={this.handleSliderCommit}
            orientation="vertical" track="inverted"
          />
          <CurrentHeightSlider
            value={this.currentHeight()}
            orientation="vertical"
            track="inverted"
          />
        </div>
        <div className="blindset-name">
          {this.props.blindsetName}
        </div>
        {this.autoToggleMarkup()}
        <Snackbar
          message={`Auto mode on ${this.props.blindsetName} blinds has been ${this.state.autoEnabled ? 'enabled' : 'disabled'}`}
          open={this.state.autoSwitchNotificationVisible}
          autoHideDuration={4000}
          onClose={() => {this.setState({autoSwitchNotificationVisible: false})}}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </li>
    );
  }
}

export default BlindsetSlider;

import React, { Component } from 'react';
import { Slider, Button } from '@material-ui/core';
import { withStyles, MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import './App.css';


import Switch from '@material-ui/core/Switch';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';


const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
  },
});

const ThumblessSlider = withStyles({
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

const SetSlider = withStyles({
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

class BlindHeightIndicator extends Component {

  state = {
    blindsetName: '',
    blindNums: [],
    blindStates: {},
    setHeight: 100,
    isMovingSetSlider: false
  }

  componentDidMount() {
    this.interval = setInterval(this.tick, 1000);
    let firstActiveBlindState = this.getFirstActiveBlindState();
    if (firstActiveBlindState) {
      this.setState({ setHeight: 100-firstActiveBlindState.set });
    }
  }

  tick = () => {
    let firstActiveBlindState = this.getFirstActiveBlindState();
    if (firstActiveBlindState && !this.state.isMovingSetSlider) {
      this.setState({ setHeight: 100-firstActiveBlindState.set });
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

  sendCommand(command) {
    let blinds = this.props.blindNums;
    console.log("Received command: ", command);
    console.log(" -> Sending to:", blinds);
    fetch('/api/blinds', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blinds: blinds, command: command }),
    }).then((response) => {
      const body = response.text();
      this.setState({ responseToCommand: body });
    });
  }

  isMoving() {
    if(!this.props.blindStates) {
      return false;
    }
    let isMoving = false;
    this.props.blindNums.forEach((num) => {
      let state = this.props.blindStates[num];
      if (state.cur !== state.set) {
        isMoving = true;
        return;
      }
    });
    return isMoving;
  }

  setSliderChanged = (e, newVal) => {
    e.preventDefault();
    this.setState({ setHeight: newVal, isMovingSetSlider: true });
  }

  handleSliderCommit = (event, newValue) => {
    this.sendCommand(100-newValue);
    setTimeout(() => {
      this.setState({ isMovingSetSlider: false });
    }, 1500);
  }

  render() {
    let firstActiveBlindstate = this.getFirstActiveBlindState();
    let curHeight=100;
    let autoToggleMarkup;

    let toggleAuto = () => {
      console.log("Toggle auto for: ", this.props.blindsetName);
      // this.setState({  'autoEnabled' : !this.state.autoEnabled });
    }

    if (this.props.autoSensor) {
      autoToggleMarkup = <FormGroup>
        <FormControlLabel
          control={<Switch size="small" checked={this.state.autoEnabled} onChange={toggleAuto} />}
          label="Auto"
          labelPlacement="bottom"
        />
      </FormGroup> 
    } else {
      autoToggleMarkup = ' ';
    }

    if (firstActiveBlindstate) {
      curHeight = 100-firstActiveBlindstate.cur;
      if (!this.isMoving) {
        this.setState("setHeight", 100-firstActiveBlindstate.set);
      }
    }

    return (
      <li className="blind-height-indicator">
        <div className="actions">
          <SetSlider onChange={this.setSliderChanged} value={this.state.setHeight} onChangeCommitted={this.handleSliderCommit} orientation="vertical" track="inverted" />
          <ThumblessSlider value={curHeight} orientation="vertical" track="inverted" />
        </div>
        <div className="blindset-name">
          {this.props.blindsetName}
        </div>
        {autoToggleMarkup}
      </li>
    );
  }
}

class App extends Component {

  state = {
    blindStates: null,
    post: '',
    responseToPost: '',
  };

  blindSets = {
    "All"        : {
      nums: ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']
    },
    "East"       : {
      nums: ['2','1','3','4','5','6','7','8','9'],
      autoSensor: 1
    },
    "North"      : {
      nums: ['11','10','12'],
      autoSensor: 2
    },
    "North Door" : {
      nums: ['10']
    },
    "West"       : {
      nums: ['13','14','15'],
      auto: true,
      autoSensor: 3
    },
    "West Door"  : {
      nums: ['14']
    }
  }

  // Poll the arduinos for their state
  componentDidMount() {
    this.interval = setInterval(this.tick, 1000);
  }

  tick = () => {
    this.getBlindStates().then((data) => {
      this.setState({
        blindStates: data.blindStates,
        autoStates: data.autoStates
      });
    }).catch((err) => {
      console.log(err)
    });
  }

  getBlindStates = async () => {
    const resp = await fetch('/api/blinds');
    const body = await resp.json();
    if (resp.status !== 200) throw Error(body.message);
    return body;
  }

  handleSubmit = async e => {
    e.preventDefault();
    let [blindSetName, command] = this.state.post.split(' ');
    let blinds = this.blindSets.nums[blindSetName];
    console.log("blind set name: ", blindSetName);
    console.log("command: ", command);
    console.log("blinds: ", blinds);
    const response = await fetch('/api/blinds', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blinds: blinds, command: command }),
    });

    const body = await response.text();

    this.setState({ responseToPost: body });
  }

  render() {
    let blindStates = this.state.blindStates;
    let blindHeightsContainer;
    if (blindStates) {
      blindStates = "Loading blind states...";
      blindHeightsContainer = <ul className="blind-heights-container">
        {Object.keys(this.blindSets).map((blindSetName, i) => {
          return <BlindHeightIndicator
              key={blindSetName}
              blindStates={this.state.blindStates}
              blindsetName={blindSetName}
              blindNums={this.blindSets[blindSetName].nums}
              autoSensor={this.blindSets[blindSetName].autoSensor}
            />
        })}
      </ul>
    } else {
      blindStates = JSON.stringify(blindStates, null, 2);
      blindHeightsContainer = "Loading blind heights...";
    }

    return (
      <MuiThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div className="App" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', }}>
          {blindHeightsContainer}
        </div>
      </MuiThemeProvider>
    );
  }
}

export default App;

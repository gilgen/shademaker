import React, { Component } from 'react';
import Slider from '@material-ui/core/Slider';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import { withStyles, MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from '@material-ui/styles';

import logo from './logo.svg';
import _ from 'lodash';

import './App.css';


const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
  },
});

const ThumblessSlider = withStyles({
  // thumb: {
  //   width: "15px !important",
  // },
  root: {
  },
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

const PrettoSlider = withStyles({
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
    blindStates: {}
  }

  cmdClick(command) {
    this.sendCommand(command);
  }

  sendCommand(command) {
    let blindsetName = this.props.blindsetName;
    let blinds = this.props.blindNums;
    console.log("Received command: ", command);
    console.log(" -> Sending to:", blinds);
    const response = fetch('/api/blinds', {
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

  sliderChanged(e, newHeight) {
    console.log("Slider changed", e, newHeight);
    console.log(this);
    this.throttledDebouncedSendCommand(newHeight);
  }

  render() {

    let currentHeight = 100, setHeight = 100, firstActiveBlindState;

    const handleSliderCommit = (event, newValue) => {
      this.sendCommand(100-newValue);
    };

    this.props.blindNums.find((n) => {
      if (this.props.blindStates[n].cur !== "unreachable") {
        firstActiveBlindState = this.props.blindStates[n];
        return true;
      }
    });

    if (firstActiveBlindState) {
      currentHeight = 100 - firstActiveBlindState.cur;
      setHeight = firstActiveBlindState.set;
    }

    return (
      <li className="blind-height-indicator">
        <div className="actions">
          {/*
          <Button variant="contained" color="primary" onClick={() => this.cmdClick(0)}>Put blinds up</Button>
          <Button variant="contained" disabled={!this.isMoving()} onClick={() => this.cmdClick(101)}>Stop</Button>
          <Button variant="contained" color="primary" onClick={() => this.cmdClick(100)}>Put blinds down</Button>
          */}
          <PrettoSlider defaultValue={currentHeight} onChangeCommitted={handleSliderCommit} orientation="vertical" track="inverted" />
          <ThumblessSlider value={currentHeight} orientation="vertical" track="inverted" />
        </div>
        <div className="blindset-name">
          {this.props.blindsetName}
        </div>
        <Divider orientation="vertical" flexItem />
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
    "All"        : ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15'],
    "East"       : ['1','2','3','4','5','6','7','8','9'],
    "North"      : ['10','11','12'],
    "West"       : ['13','14','15'],
    "North Door" : ['10'],
    "West Door"  : ['14']
  }

  // Poll the arduinos for their state
  componentDidMount() {
    this.interval = setInterval(this.tick, 1000);
  }

  tick = () => {
    this.refreshBlindStates().then((data) => {
      this.setState({ blindStates: data })
    }).catch((err) => {
      console.log(err)
    });
  }

  refreshBlindStates = async () => {
    const resp = await fetch('/api/blinds');
    const body = await resp.json();
    if (resp.status !== 200) throw Error(body.message);
    return body;
  }

  handleSubmit = async e => {
    e.preventDefault();
    let [blindSetName, command] = this.state.post.split(' ');
    let blinds = this.blindSets[blindSetName];
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
              blindNums={this.blindSets[blindSetName]}
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

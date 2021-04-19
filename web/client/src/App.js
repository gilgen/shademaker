import React, { Component } from 'react';
import { Slider } from '@material-ui/core';
import { withStyles, MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import './App.css';

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

    if (firstActiveBlindstate) {
      curHeight = 100-firstActiveBlindstate.cur;
      if (!this.isMoving) {
        this.state.setHeight = 100-firstActiveBlindstate.set;
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
    "North"      : ['11','10','12'], // This is purposely out of order to prevent slider-child-changing-parent
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

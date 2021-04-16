import React, { Component } from 'react';
import Slider from '@material-ui/core/Slider';

import logo from './logo.svg';

import './App.css';

class BlindHeightIndicator extends Component {
  state = {
    blindsetName: '',
    blindNums: []
  }

  cmdClick(command) {
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

  downClicked() {
    console.log("Down clicked");
  }

  render() {
    return (
      <div className="blind-height-indicator">
        Name: {this.props.blindsetName}<br />
        Nums: {this.props.blindNums.join(", ")}
        <div className="actions">
          <button onClick={() => this.cmdClick(100)}>Up</button>
          <button onClick={() => this.cmdClick(0)}>Down</button>
          <button onClick={() => this.cmdClick(101)}>Stop</button>
        </div>
      </div>
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
    "All"        : [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
    "East"       : [1,2,3,4,5,6,7,8,9],
    "North"      : [10,11,12],
    "West"       : [13,14,15],
    "North Door" : [10],
    "West Door"  : [14]
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
    if (!blindStates) {
      blindStates = "Loading blind states...";
    } else {
      blindStates = JSON.stringify(blindStates, null, 2);
    }

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </header>

        <div className="blind-heights-container">
          {Object.keys(this.blindSets).map((blindSetName, i) => {
            return <BlindHeightIndicator
              key={blindSetName}
              blindStates={blindStates}
              blindsetName={blindSetName}
              blindNums={this.blindSets[blindSetName]}
            />
          })}
        </div>

        <pre>{blindStates}</pre>
      </div>
    );
  }
}

export default App;

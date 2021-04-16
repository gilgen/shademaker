import React, { Component } from 'react';
import Slider from '@material-ui/core/Slider';

import logo from './logo.svg';

import './App.css';

class App extends Component {
  state = {
    blindStates: '',
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

  refreshBlindStates = async () => {
    const resp = await fetch('/api/blinds');
    const body = await resp.json();
    if (resp.status !== 200) throw Error(body.message);
    return body;
  };

  tick = () => {
    this.refreshBlindStates().then((blindStatesJson) => {
      this.setState({ blindStates: JSON.stringify(blindStatesJson) })
    }).catch((err) => {
      console.log(err)
    });
  }

  handleSliderMove(sliderComponent) {
    console.log("In handle slider move");
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
  };

  handleChange(event) {
    console.log("handle change");
  }

  render() {
    let blindStates = this.state.blindStates;
    let curVal = 100;
    if (!blindStates) {
      blindStates = "Loading blind states... :)";
    } else {
      curVal = blindStates["2"]["cur"];
    }
    let style = { height: "300px" };

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </header>
        <p>{blindStates}</p>

        <Slider
          orientation="vertical"
          style={style}
          value={curVal}
          defaultValue={100}
          onChange={this.handleChange}
          min={0}
          max={100}
        />

        <form onSubmit={this.handleSubmit}>
          <p>
            <strong>Post to Server:</strong>
          </p>
          <input type="text" value={this.state.post} onChange={e => this.setState({ post: e.target.value })} />
          <button type="submit">Submit</button>
        </form>
        <p>{this.state.responseToPost}</p>
      </div>
    );
  }
}

export default App;

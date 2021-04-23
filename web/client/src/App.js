import React, { Component } from 'react';
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import BlindsetSlider from "./blindset-slider";
import BlindSettingsButtons from "./blind-settings-buttons";
import blindSets from "./config/blindsets";
import { getBlindStates } from './blind-functions';
import IconButton from '@material-ui/core/IconButton';
import SettingsIcon from '@material-ui/icons/Settings';
import './App.css';


const theme = createMuiTheme({
  palette: {
    type: 'dark',
  },
});

class App extends Component {

  constructor(props) {
    super(props);
    this.blindSliders = this.blindSliders.bind(this);
    this.getBlindStates = getBlindStates.bind(this);
    this.settingsClicked = this.settingsClicked.bind(this);
    this.settings = this.settings.bind(this);
    this.mainContent = this.mainContent.bind(this);
  }

  state = {
    blindStates: null,
    post: '',
    responseToPost: '',
    settingsMode: false
  };

  // Poll the arduinos for their state
  componentDidMount() {
    this.interval = setInterval(this.tick, 1000);
    this.tick();
  }

  componentWillUnmount() {
    if(this.interval) {
      console.log("Clearing tick interval in app");
      clearInterval(this.interval);
    }
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

  settingsClicked() {
    this.setState({ settingsMode: !this.state.settingsMode });
  }

  BlindSettingsButtons

  settings() {
    return <ul className="blind-heights-container">
      {blindSets['All'].nums.map((blindNumber) => {
        return <BlindSettingsButtons
          key={"blind-number-" + blindNumber}
          blindStates={this.state.blindStates}
          autoStates={this.state.autoStates}
          blindNumber={blindNumber}
        />
      })}
    </ul>
  }

  mainContent() {
    if (this.state.settingsMode) {
      return this.settings();
    } else {
      return this.blindSliders();
    }
  }

  blindSliders() {
    if (this.state.blindStates) {
      return <ul className="blind-heights-container">
        {Object.keys(blindSets).map((blindSetName) => {
          return <BlindsetSlider
            key={blindSetName}
            blindStates={this.state.blindStates}
            autoStates={this.state.autoStates}
            blindsetName={blindSetName}
            blindNums={blindSets[blindSetName].nums}
            autoSensor={blindSets[blindSetName].autoSensor}
          />
        })}
      </ul>
    } else {
      return "Loading blind heights...";
    }
  }

  render() {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <div className="App" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', }}>
          <IconButton fontSize="small" onClick={this.settingsClicked} className="settings-icon" aria-label="delete" size="small">
            <SettingsIcon />
          </IconButton>
          {this.mainContent()}
        </div>
      </MuiThemeProvider>
    );
  }

}

export default App;

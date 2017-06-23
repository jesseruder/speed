import React from 'react';
import {
  Button,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio, Pedometer } from 'expo';

const MIN_RATE = 0.6;
const MAX_RATE = 1.0;
const RATE_CHANGE_SPEED = 0.003;
const IDLE_RATE_DECREASE = 0.002;
const MIN_IDLE_RATE = 0.3;

export default class HomeScreen extends React.Component {
  static navigationOptions = {
    header: null,
  };

  constructor(props) {
    super(props);

    this.state = {
      isPedometerAvailable: false,
      lastSteps: 0,
      ratio: 0,
      numUpdates: 0,
      timeStartUpdates: null,
    };
  }

  componentDidMount() {
    this._checkPedometerAsync();
  }

  _checkPedometerAsync = async () => {
    let isPedometerAvailable = Pedometer.isAvailableAsync();
    this.setState({
      isPedometerAvailable,
      lastTimeUpdated: Date.now(),
      timeStartUpdates: Date.now(),
    });

    if (isPedometerAvailable) {
      await this._loadMusicAsync();
      Pedometer.watchStepCount(this._onStepAsync);
      setInterval(this._updateRateAsync, 100);
    }
  }

  _onStepAsync = async (event) => {
    let steps = event.steps;
    let diffSteps = steps - this.state.lastSteps;
    let diffTime = Date.now() - this.state.lastTimeUpdated;
    let ratio = 1000 * diffSteps / diffTime;

    let rate = ratio / 3.0;
    if (rate < 0) {
      rate = 0;
    } else if (rate > 1) {
      rate = 1;
    }

    rate = MIN_RATE + ((MAX_RATE - MIN_RATE) * rate);

    let numUpdates = this.state.numUpdates + 1;
    let avgTimeBetweenUpdates = (Date.now() - this.state.timeStartUpdates) / numUpdates;

    let stateObject = {};
    if (ratio > 0 && !this._isSoundPlaying) {
      await this._soundObject.playAsync();
      await this._soundObject.setIsLoopingAsync(true);
      this._isSoundPlaying = true;
      stateObject.currentRate = rate;
      this._soundObject.setRateAsync(rate, false);
    }

    this.setState({
      ...stateObject,
      desiredRate: rate,
      ratio,
      lastSteps: steps,
      lastTimeUpdated: Date.now(),
      numUpdates,
      avgTimeBetweenUpdates,
    });
  }

  _updateRateAsync = async () => {
    let { currentRate, desiredRate, lastTimeUpdated, avgTimeBetweenUpdates } = this.state;
    if (currentRate < desiredRate) {
      currentRate += RATE_CHANGE_SPEED;
      if (currentRate > desiredRate) {
        currentRate = desiredRate;
      }
    }

    if (currentRate > desiredRate) {
      currentRate -= RATE_CHANGE_SPEED;
      if (currentRate < desiredRate) {
        currentRate = desiredRate;
      }
    }

    let timeBetweenUpdates = Date.now() - lastTimeUpdated;
    if (timeBetweenUpdates > avgTimeBetweenUpdates) {
      desiredRate -= IDLE_RATE_DECREASE;
      if (desiredRate < MIN_IDLE_RATE) {
        desiredRate = MIN_IDLE_RATE;
      }
    }

    this.setState({
      currentRate,
      desiredRate,
    });
    await this._soundObject.setRateAsync(currentRate, false);
  }

  _loadMusicAsync = async () => {
    this._soundObject = new Audio.Sound();
    this._isSoundPlaying = false;
    try {
      await this._soundObject.loadAsync(require('../assets/music/eyeoftiger.mp3'));
    } catch (error) {
      // An error occurred!
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <Image source={require('../assets/images/pavement-texture.jpg')} style={styles.backgroundImage} />
        <View style={styles.insideContainer}>
          <Image source={require('../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.text}>Start moving to hear the music {this.state.ratio}</Text>
          <Text style={styles.text}>current rate {this.state.currentRate}</Text>
          <TouchableOpacity onPress={() => this.props.navigation.navigate('Settings')} style={styles.settingsContainer}>
            <Image source={require('../assets/images/settings.png')} style={styles.settings} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  insideContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  logo: {
    marginTop: 60,
    marginBottom: 60,
  },
  settingsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  settings: {
    width: 60,
    height: 60,
  },
  text: {
    fontFamily: 'rationale',
    color: '#ccc',
    fontSize: 25,
  },
});

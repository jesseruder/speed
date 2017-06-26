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
const DONT_STOP_TEXT = `DON'T STOP!!!`;

class RobotText extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentNumCharacters: 0,
      showingBlinker: true,
    };
  }

  componentWillMount() {
    setInterval(this._writeCharacter, 60);
    setInterval(this._flashBlinker, 300);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.text !== nextProps.text) {
      this.setState({
        currentNumCharacters: 0,
      })
    }
  }

  _writeCharacter = () => {
    this.setState({
      currentNumCharacters: this.state.currentNumCharacters + 1,
    });
  };

  _flashBlinker = () => {
    let showingBlinker = !this.state.showingBlinker;
    if (this.state.currentNumCharacters >= this.props.text.length - 1) {
      showingBlinker = false;
    }

    this.setState({
      showingBlinker,
    });
  }

  render() {
    return (
      <Text style={styles.text}>{this.props.text.substring(0, this.state.currentNumCharacters) + (this.state.showingBlinker ? '_' : '')}</Text>
    );
  }
}

export default class MainScreen extends React.Component {
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
      text: '',
    };
  }

  componentDidMount() {
    this._checkPedometerAsync();
  }

  _checkPedometerAsync = async () => {
    let isPedometerAvailable = Pedometer.isAvailableAsync();

    if (isPedometerAvailable) {
      this.setState({
        text: 'Start running to play music',
        isPedometerAvailable,
        lastTimeUpdated: Date.now(),
        timeStartUpdates: Date.now(),
      });

      await this._loadMusicAsync();
      Pedometer.watchStepCount(this._onStepAsync);
      setInterval(this._updateRateAsync, 100);
    }
  }

  _onStepAsync = async (event) => {
    let steps = event.steps;
    let diffSteps = steps - this.state.lastSteps;
    if (diffSteps === 0) {
      return;
    }

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
      stateObject.text = 'Nice! Keep going'
      this._soundObject.setRateAsync(rate, false);
    }

    if (this.state.text === DONT_STOP_TEXT) {
      stateObject.text = 'NICE!!';
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
    let oldCurrentRate = currentRate;
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

    let stateObject = {};
    if (oldCurrentRate >= MIN_RATE + 0.1 && currentRate < MIN_RATE + 0.1) {
      stateObject.text = "Faster!";
    } else if (oldCurrentRate <= MAX_RATE - 0.2 && currentRate > MAX_RATE - 0.2) {
      stateObject.text = "Keep going!"
    } else if (oldCurrentRate <= MAX_RATE - 0.1 && currentRate > MAX_RATE - 0.1) {
      stateObject.text = "YOU'RE FAST!!"
    }

    let timeBetweenUpdates = Date.now() - lastTimeUpdated;
    if (timeBetweenUpdates > avgTimeBetweenUpdates * 1.2) {
      desiredRate -= IDLE_RATE_DECREASE;

      stateObject.text = DONT_STOP_TEXT;

      if (desiredRate < MIN_IDLE_RATE) {
        desiredRate = MIN_IDLE_RATE;

        stateObject.text = 'BOOOOOOOO';
      }
    }

    this.setState({
      ...stateObject,
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
          <RobotText style={styles.text} text={this.state.text} />
        </View>
      </View>
    );
  }
}

/*<TouchableOpacity onPress={() => this.props.navigation.navigate('Settings')} style={styles.settingsContainer}>
  <Image source={require('../assets/images/settings.png')} style={styles.settings} />
</TouchableOpacity>*/

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  insideContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  logo: {
    paddingTop: 100,
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
    marginBottom: 100,
    fontFamily: 'rationale',
    color: '#ccc',
    fontSize: 30,
    paddingLeft: 20,
    paddingRight: 20,
  },
});

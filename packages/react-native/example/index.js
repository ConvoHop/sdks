// Installs the platform globals and LiveKit's WebRTC before anything imports livekit-client.
import './src/setup';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

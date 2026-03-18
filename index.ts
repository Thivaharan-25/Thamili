

console.log('🔵 [index.ts] Step 1: Loading gesture-handler...');
import 'react-native-gesture-handler';
console.log('✅ [index.ts] Step 2: gesture-handler loaded');


console.log('🔵 [index.ts] Step 3: Loading URL polyfill...');
import 'react-native-url-polyfill/auto';
console.log('✅ [index.ts] Step 4: URL polyfill loaded successfully');

console.log('🔵 [index.ts] Step 5: Importing registerRootComponent...');
import { registerRootComponent } from 'expo';
console.log('✅ [index.ts] Step 6: registerRootComponent imported');

console.log('🔵 [index.ts] Step 7: Importing App component...');
import App from './App';
console.log('✅ [index.ts] Step 8: App component imported');

console.log('🔵 [index.ts] Step 9: Registering root component...');
registerRootComponent(App);
console.log('✅ [index.ts] Step 10: Root component registered successfully');
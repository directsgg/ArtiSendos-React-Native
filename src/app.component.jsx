import React, { useState, useEffect } from 'react';
import {
  Animated,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  ToastAndroid,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { Button, Colors, View, ActionSheet } from 'react-native-ui-lib';
import IconMaterial from 'react-native-vector-icons/MaterialIcons';

import { BleManager, /*Characteristic, Device */ } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
import { PERMISSIONS, requestMultiple } from 'react-native-permissions';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';

const BOX_UUID = 'f27b53ad-c63d-49a0-8c0f-9f297e6cc520';

const BLTManager = new BleManager();

const IconArrowDropUp = props => (
  <IconMaterial name="arrow-drop-up" {...props} />
);

const IconArrowDropDown = props => (
  <IconMaterial name="arrow-drop-down" {...props} />
);

const IconArrowLeft = props => (
  <IconMaterial name="arrow-left" {...props} />
);

const IconArrowRight = props => (
  <IconMaterial name="arrow-right" {...props} />
);

const IconBluetoothDisabled = props => (
  <IconMaterial name="bluetooth-disabled" {...props} />
);

const IconBluetoothConnected = props => (
  <IconMaterial name="bluetooth-connected" {...props} />
);

export default () => {
  const [visibleActionSheet, setVisibleActionSheet] = useState(false);
  const [allDevices, setAllDevices] = useState([]);
  const [devicesActionSheet, setDevicesActionSheet] = useState([]);
  // ¿existe algun dispositivo conectado?
  const [isConnected, setIsConnected] = useState(false);

  // ¿que dispositivo esta conectado?
  const [connectedDevice, setConnectedDevice] = useState();
  const [deviceName, setDeviceName] = useState("Control BLE");

  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    // Anima el cambio de color de fondo
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 700000, // duracion de la animacion en milisegundos
        useNativeDriver: false, // especifica el uso del controlador nativo
      })
    ).start();

    return () => {
      animation.stop();
    }
  }, [animatedValue]);

  // calcula el valor de color de fondo interpolando entre dos colores
  const interpolateColor = animatedValue.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ['#3498db', '#f1c40f', '#e74c3c', '#3498db'], // colores inicial y final del gradiente
  });

  const isDuplicateDevice = (devices, nextDevice) =>
    devices.findIndex(device => nextDevice.id === device.id) > -1;


  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: 'Escaner de Bluetoth BLE',
        message: 'Requerido para escanear dispositivos bluetooth',
        buttonPositive: 'Aceptar',
      }
    );

    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: 'Conexion Bluetoth BLE',
        message: 'Requerido para conectar dispositivos bluetooth',
        buttonPositive: 'Aceptar',
      }
    );

    const bluetoothFineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Localización Bluetooth',
        message: 'Requerido para permitir conexiones Bluetooth BLE',
        buttonPositive: 'Aceptar',
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      bluetoothFineLocationPermission === "granted"
    );

  }

  const requestPersmissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = await DeviceInfo.getApiLevel();
      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          'android.permission.ACCESS_FINE_LOCATION',
          {
            title: 'Permisos de Localización Bluetooth',
            message: 'Requerido para Bluetooth',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await requestMultiple([
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ]);

        const isAllPermissionsGranted =
          result['android.permission.BLUETOOTH_SCAN'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_CONNECT'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.ACCESS_FINE_LOCATION'] ===
          PermissionsAndroid.RESULTS.GRANTED;
        return isAllPermissionsGranted;
      }
    } else {
      return true;
    }
  };

  const scanForPeripherals = () => {
    ToastAndroid.show('Escaneando, espera...', ToastAndroid.SHORT);
    setAllDevices([]);
    setDevicesActionSheet([]);

    BLTManager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        console.log(error);
        if (error.message.includes('BluetoothLE is powered off')) {
          ToastAndroid.show("Activa Bluetooth", ToastAndroid.SHORT);
        } else if (error.message.includes('Location services are disabled')) {
          ToastAndroid.show("Activa la ubicación", ToastAndroid.SHORT);
        }
        else {
          ToastAndroid.show("Error: " + error, ToastAndroid.SHORT);
        }
        setVisibleActionSheet(false);
      }

      // if (scannedDevice && scannedDevice.name == 'blto') {
      //   BLTManager.stopDeviceScan();
      //   connectDevice(scannedDevice)
      // }
      if (scannedDevice) {
        let _allDevices = [], _devicesAcSh = [];
        if (!isDuplicateDevice(allDevices, scannedDevice)) {
          _allDevices = [...allDevices, scannedDevice];
          _devicesAcSh = [
            ...devicesActionSheet,
            {
              label: scannedDevice.name,
              onPress: () => connectDevice(scannedDevice)
            }
          ];
        } else {
          _allDevices = allDevices;
          _devicesAcSh = devicesActionSheet;
        }
        setAllDevices(_allDevices);
        setDevicesActionSheet(_devicesAcSh);
      }
    });

    setVisibleActionSheet(true);
    // detener el escaneo de dispositivos después de 5 segundos
    setTimeout(() => {
      BLTManager.stopDeviceScan();

    }, 5000);
  }

  // Escanea los dispositivos BLT disponibles y 
  // a continuacion se muestra los dispositivos
  const scanDevices = async () => {

    const isPermissionsEnabled = await requestPersmissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    };

    // PermissionsAndroid.request('android.permission.ACCESS_FINE_LOCATION', {
    //   title: 'Permisos de Localización Bluetooth',
    //   message: 'Requerido para Bluetooth',
    //   buttonNegative: 'Cancelar',
    //   buttonPositive: 'Aceptar',
    // })
    //   .then(answere => {

    //   });
  }

  // Manejar la desconexión del dispositivo
  const disconnectDevice = async () => {
    ToastAndroid.show('Desconectando...', ToastAndroid.SHORT);

    if (connectedDevice != null) {
      const isDeviceConnected = await connectedDevice.isConnected();
      if (isDeviceConnected) {
        BLTManager.cancelTransaction('messagetransaction');
        BLTManager.cancelTransaction('nightmodetransaction');

        BLTManager.cancelDeviceConnection(connectedDevice.id)
          .then(() => {
            ToastAndroid.show('Desconexion completa', ToastAndroid.SHORT);
          });
      }

      const connectionStatus = await connectedDevice.isConnected();
      if (!connectionStatus) {
        setIsConnected(false);
      }
    }
  }

  // funcion para enviar datos a ESP32
  const sendBoxValue = async (value) => {
    BLTManager.writeCharacteristicWithResponseForDevice(
      connectedDevice?.id,
      SERVICE_UUID,
      BOX_UUID,
      base64.encode(value.toString()),
    ).catch(e => {
      if (e.toString().includes('is not connected')) {
        ToastAndroid.show(
          'Error: ningun dispositivo conectado',
          ToastAndroid.SHORT
        );
      } else {
        ToastAndroid.show(
          e,
          ToastAndroid.SHORT
        );
      }
    });
    // .then(characteristic => {
    //   ToastAndroid.show(
    //     'BoxValue changet to: ' + base64.decode(characteristic.value),
    //     ToastAndroid.SHORT
    //   );
    // });
  }

  // Conectar el dispositivo y monitorear las características 
  const connectDevice = async (device) => {
    ToastAndroid.show(
      'Conectado al dispositivo: ' + device.name,
      ToastAndroid.SHORT
    );

    device
      .connect()
      .then(device => {
        setDeviceName(device.name);
        setConnectedDevice(device);
        setIsConnected(true);
        return device.discoverAllServicesAndCharacteristics();
      })
      .then(device => {
        // set what to do when DC is detected
        BLTManager.onDeviceDisconnected(device.id, (error, device) => {
          setDeviceName("Control BLE");
          ToastAndroid.show(
            'Dispositivo desconectado',
            ToastAndroid.SHORT
          );
          setIsConnected(false);
        });

        // read initial values


        ToastAndroid.show(
          'Conexion establecida',
          ToastAndroid.SHORT
        );
      });
  }

  const renderControl = (
    <View flex center >
      <View>
        <Button
          iconSource={() =>
            <IconArrowDropUp size={72} color={Colors.black} />
          }
          backgroundColor={Colors.white}
          round
          onPressIn={() => sendBoxValue('a')}
          onPressOut={() => sendBoxValue('p')}
        />
      </View>

      <View row>
        <Button
          iconSource={() =>
            <IconArrowLeft size={72} color={Colors.black} />
          }
          backgroundColor={Colors.white}
          round
          onPressIn={() => sendBoxValue('i')}
          onPressOut={() => sendBoxValue('p')}
        />
        <View width={72} />
        <Button
          iconSource={() =>
            <IconArrowRight size={72} color={Colors.black} />
          }
          backgroundColor={Colors.white}
          round
          onPressIn={() => sendBoxValue('d')}
          onPressOut={() => sendBoxValue('p')}
        />
      </View>

      <View>
        <Button
          iconSource={() =>
            <IconArrowDropDown size={72} color={Colors.black} />
          }
          backgroundColor={Colors.white}
          round
          onPressIn={() => sendBoxValue('r')}
          onPressOut={() => sendBoxValue('p')}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.mainContainer}>
      {/** Fondo de gradiente animado */}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: interpolateColor },
        ]}
      />

      <View row spread style={{ flexWrap: 'wrap' }} >
        <View marginR-10 marginL-4 flex>
          <Text style={styles.title}>{deviceName}</Text>
        </View>
        {!isConnected ? (
          <Button
            iconSource={() =>
              <IconBluetoothDisabled size={36} color={Colors.white} />
            }
            backgroundColor={Colors.transparent}
            round
            marginR-10
            marginT-4
            onPress={() => scanDevices()}
          />
        ) : (
          <Button
            iconSource={() =>
              <IconBluetoothConnected size={36} color={Colors.blue10} />
            }
            backgroundColor={Colors.white}
            round
            marginR-10
            marginT-4
            onPress={() => disconnectDevice()}
          />
        )}
      </View>
      {renderControl}
      <ActionSheet
        visible={visibleActionSheet}
        title={'Conectarse a Bluetooth...'}
        message={'Dispositivos disponibles'}
        onDismiss={() => setVisibleActionSheet(false)}
        options={devicesActionSheet}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    marginVertical: 10,
    color: Colors.$textDisabled
  },
});
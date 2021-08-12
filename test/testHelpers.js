import assertArrays from 'chai-arrays'

const testData = require('./testData');

//function for converting latitude & longitude generated from random location to lat & lng required in payload
const getLatitudeLongitudeAsPerPayload = (location) => {
  const latitudeLongitude = Object.assign({}, location);
  latitudeLongitude.lat = latitudeLongitude.latitude;
  latitudeLongitude.lng = latitudeLongitude.longitude;
  return latitudeLongitude;
};

//function to create order payload
const orderCreatePayload = () => {

  const createOrderPayload = {};
  createOrderPayload.stops = [];

  const randomLocation = require('random-location');

  //adding the starting point in stops
  createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(testData.startPoint));

  //considering 2 random stops here. this can be optimized further by using for loop for generating multiple stops
  const randomStop1 = randomLocation.randomCirclePoint(testData.startPoint, testData.radius);
  const randomStop2 = randomLocation.randomCirclePoint(testData.startPoint, testData.radius);
  createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(randomStop1));
  createOrderPayload.stops.push(getLatitudeLongitudeAsPerPayload(randomStop2));

  return createOrderPayload;

};

//function to check if fare amount is correct
const isFareAmountCorrect = (actualFareAmount, totalDistance, isOddHours) => {
  // 20$ for first 2000 meters and 5$ for every 200 meters if order placed between 5am - 9pm
  const calculatedNormalFareAmount = (totalDistance - 2000) / 200 * 5 + 20;
  // 30$ for first 2000 meters and 8$ for every 200 meters if order placed between 9pm - 5am
  const calculatedOddHoursFareAmount = (totalDistance - 2000) / 200 * 8 + 30;

  console.log(totalDistance + "----totalDistance-----");
  console.log(actualFareAmount + "----actualFareAmount-----");
  console.log(calculatedNormalFareAmount + "----calculatedNormalFareAmount-----");
  console.log(calculatedOddHoursFareAmount + "----calculatedOddHoursFareAmount-----");
  if (!isOddHours) {
    return (actualFareAmount - calculatedNormalFareAmount) < testData.tolerance;
  } else {
    return (actualFareAmount - calculatedOddHoursFareAmount) < testData.tolerance;
  }
};

exports.isFareAmountCorrect = isFareAmountCorrect;
exports.orderCreatePayload = orderCreatePayload;
exports.getLatitudeLongitudeAsPerPayload = getLatitudeLongitudeAsPerPayload;

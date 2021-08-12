import supertest from 'supertest';

const getRequestURL = () => {
  return supertest("http://localhost:51544");
};

//considering the start point as one of the stops in the given payload
const startPoint = {
  latitude: 22.344674,
  longitude: 114.124651
}

//considering the radius as 5000 meters here
const radius = 5000;

//adding tolerance for calculating the fare amount
const tolerance = 0.01;

//incorrect orderID for negative scenario
const incorrectOrderId = 12345;

//incorrect location for negative testing
const incorrectCoOrdinates = {
  latitude: 0.344674,
  longitude: 114.124651
};

//HK currency
const currency = 'HKD';

exports.getRequestURL = getRequestURL;
exports.startPoint = startPoint;
exports.radius = radius;
exports.tolerance = tolerance;
exports.incorrectOrderId = incorrectOrderId;
exports.incorrectCoOrdinates = incorrectCoOrdinates;

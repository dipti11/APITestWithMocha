import StatusCodes from 'http-status-codes';
import {
  expect
} from 'chai';

const testHelpers = require('./testHelpers');
const testData = require('./testData');

//function to verify create order api response (for post api)
function verifyCreateOrderResponse(response, isOddHours) {
  var totalDistance = 0;
  expect(response.body).to.have.keys(['id', 'drivingDistancesInMeters', 'fare']);
  expect(response.statusCode).to.equal(StatusCodes.CREATED);
  expect(response.body.id).to.be.a('number');
  expect(response.body.drivingDistancesInMeters).to.be.an('array');
  for (var i in response.body.drivingDistancesInMeters) {
    expect(response.body.drivingDistancesInMeters[i]).to.be.a('number');
    totalDistance = totalDistance + response.body.drivingDistancesInMeters[i]
  }
  expect(response.body.fare).to.have.property("amount");
  expect(parseFloat(response.body.fare.amount)).to.be.a('number');
  const isFareAmountCorrect = testHelpers.isFareAmountCorrect(parseFloat(response.body.fare.amount), totalDistance, isOddHours);
  expect(isFareAmountCorrect).to.be.true;
  expect(response.body.fare).to.have.property("currency").and.to.be.a('string').and.to.equal(testData.currency);

};

//function to verify the error response for the Api
function verifyErrorResponse(response, code, errorMessage) {
  expect(response.statusCode).to.equal(code);
  expect(response.body.message).to.be.a('string').and.to.equal(errorMessage);

};

//function to verify the fetch order api response (for get api)
function verifyFetchOrderResponse(response, orderStatus, orderId) {
  expect(response.body).to.have.keys(['id', 'stops', 'drivingDistancesInMeters', 'fare', 'status', 'orderDateTime', 'createdTime']);
  expect(response.statusCode).to.equal(StatusCodes.OK);
  expect(response.body.id).to.be.a('number').and.to.equal(orderId);
  expect(response.body.stops).to.be.an('array');
  for (var i in response.body.stops) {
    expect(response.body.stops[i]).to.have.keys(['lat', 'lng']);
    expect(response.body.stops[i].lat).to.be.a('number');
    expect(response.body.stops[i].lng).to.be.a('number');
  }
  expect(response.body.drivingDistancesInMeters).to.be.an('array');
  for (var i in response.body.drivingDistancesInMeters) {
    expect(response.body.drivingDistancesInMeters[i]).to.be.a('number');
  }
  expect(response.body.fare).to.have.property("amount");
  expect(response.body.fare).to.have.property("currency").and.to.be.a('string').and.to.equal(testData.currency);
  expect(response.body.status).to.be.a('string').and.to.equal(orderStatus);
  const orderDateTime = new Date(response.body.orderDateTime);
  const createdTime = new Date(response.body.createdTime);
  expect(orderDateTime >= createdTime).to.be.true;
};

//function to check the put api response
function verifyUpdateOrderResponse(response, orderStatus, statusCode, orderId) {
  expect(response.statusCode).to.equal(statusCode);
  expect(response.body.id).to.be.a('number').and.to.equal(orderId);
  expect(response.body.status).to.be.a('string').and.to.equal(orderStatus);
};


export {
  verifyCreateOrderResponse,
  verifyErrorResponse,
  verifyFetchOrderResponse,
  verifyUpdateOrderResponse
};

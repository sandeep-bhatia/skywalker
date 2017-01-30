// public/core.js
var recommendationsApp = angular.module('recommendationsApp', []);

function mainController($scope, $http) {
    $scope.formData = {};
    $scope.spinnerUrl= undefined;
    // when submitting the add form, send the text to the node API
    $scope.askRecommendation = function() {
        $scope.spinnerUrl = "images/spinner.gif";
           // when landing on the page, get all todos and show them
           $http.get('/recommendations?url=' + $scope.sourceURL)
               .success(function(data) {
                   $scope.recommendations = data;
                   $scope.spinnerUrl = undefined;
                   console.log(data);
               })
               .error(function(data) {
                   console.log('Error: ' + data);
               });
    };
}
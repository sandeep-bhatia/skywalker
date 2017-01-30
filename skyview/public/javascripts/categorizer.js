(function(angular) {
  'use strict';
angular.module('categorySelect', [])
  .controller('CategoryController', ['$scope', '$location', '$http', function($scope, $location, $http) {

   $scope.onSubmit = function() {
         // when landing on the page, get all todos and show them
             $http.get('/categorizationUrl?target=' + window.location + "&category=" + $scope.data.selectedOption.id)
                 .success(function(data) {
                     console.log(data);
                     window.close();
                 })
                 .error(function(data) {
                     console.log('Error: ' + data);
                     window.close();
                 });
      };
    $scope.data = {
     availableOptions: [
       {id: 'General', name: 'General'},
       {id: 'Technology', name: 'Technology'},
       {id: 'Business', name: 'Business'},
       {id: 'Health', name: 'Health'},
       {id: 'Lifestyle', name: 'Lifestyle'},
       {id: 'Politics', name: 'Politics'},
       {id: 'Automobiles', name: 'Automobiles'},
       {id: 'Entertainment', name: 'Entertainment'},
       {id: 'Sports', name: 'Sports'},
     ],
     selectedOption: {id: 'General', name: 'General'} //This sets the default value of the select in the ui
     };
 }]);
})(window.angular);
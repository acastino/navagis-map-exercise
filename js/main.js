/*

	You may not copy, distribute or publish any portion of this script.
	
	Created for Navagis, Inc.
	by: a.castino@gmail.com

	All Rights, Reserved.
	
*/


(function(loadingDiv, mapDiv, initMapCoords, initMapCenterObj, mapObj){

	var config = {
		initZoomLevel: 15,
		searchRadius: 5500,	//meters	//maxlimit: 50000
		infoWindowSize: {
			collapsed: 250,		//px	//ensure this value is the same in css
			expanded: 525
		},
		firebase: {
			baseUrl: 'https://navagismapexercise.firebaseio.com/',
			stateUrl: '.info/connected',
		}
	};
	
	var htmlTemplates = {
		restoInfo: {
			mainPage: function(dataSource){ return ''+
				'<div class="primaryDataHolder">'+
					'<h2 class="title"><img src="'+ dataSource.icon +'" class="restoIcon"/>'+
						'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'+ dataSource.name +'</h2>'+
					'<p class="specialty">Specialty Food: <strong></strong></p>'+
					
					'<div class="address">'+
						'<p class="onlineContactInfoBlock" style="display:none">'+
							(dataSource.formatted_address? dataSource.formatted_address +'<br>' : '') +
							(dataSource.international_phone_number?
								'Hotline: <a href="tel:'+ dataSource.international_phone_number.replace(/\s+/g,'')+ '">'+
									'<strong>'+ dataSource.formatted_phone_number +'</strong>'+
								'</a><br>' : '') +
							(dataSource.website? '<a href="'+dataSource.website+'" target="_blank">'+ dataSource.website +'</a>' : '')+
						'</p>'+
						
						'<div class="offlineContactInfoBlock" style="display:none">'+
							'<img onclick="infoWindowCommands.currentlyOffline()" src="images/offline-contact-info.gif">'+
						'</div>'+
						'<div class="loadingContactInfoBlock" style="display:none">'+
							'<img src="images/loading_spinner.gif">'+
						'</div>'+
					'</div>'+
					
					'<div class="directionsLink">'+
						'<a href="javascript:;" onclick="directionsCommands.openPanel()">'+
						'<span>'+ window.directionsCommands.travelModeChanged() +'</span> Directions'+
						'</a>'+
					'</div>'+
					
					'<div class="rating">'+
						'<p class="onlineRatingDataBlock" style="display:none">'+
							'Rating: <strong>'+ (dataSource.rating||'n/a') +'</strong><br>'+
							'Customer Reviews: '+
								'<a href="javascript:;" onclick="infoWindowCommands.confirmNewWin(\''+dataSource.url+'\')">'+(dataSource.user_ratings_total||0) +'</a>'+
							'<br>'+
							'<a href="'+ dataSource.url +'" target="_blank"><i>View on Google Maps</i></a>'+
						'</p>'+
						
						'<p class="offlineRatingDataBlock" style="display:none">'+
							'Rating: <strong>'+ (dataSource.rating||'n/a') +'</strong><br>'+
							'<img onclick="infoWindowCommands.currentlyOffline()" src="images/offline-rating-data.gif">'+
						'</p>'+
						
					'</div>'+
					
					'<div class="analyticsHolder">'+
						'<strong>Analytics:</strong>'+
						this.graphCanvas() +
					'</div>'+
				'</div>';
			},
			graphCanvas: function(){
				return '<canvas class="analyticsChart" width="250" height="200"></canvas>';
			},
			legend: function(){
				return ''+
					'<ul class="legend"><% for (var i=0; i<datasets.length; i++) { %>'+
						'<li><span style=\"background-color:<%=datasets[i].strokeColor%>\">&nbsp;&nbsp;</span>&nbsp;&nbsp;'+
							'<% if (datasets[i].label) { %><%= datasets[i].label %><% } %></li>'+
					'<% } %></ul>';
			},
			manageButton: function(){ return ''+
				'<div class="manageButton">'+
					'<span onclick="infoWindowCommands.manageButtonOnclick(this)">'+
						'Manage <span>&gt;</span>'+
					'</span>'+
				'</div>';
			},
			adminPanel: function(){ return ''+
				'<div class="adminPanel"><form onsubmit="return adminCommands.submitForm();">'+
					'<h2>Manage Restaurant</h2>'+
					'<p class="specialtyFoodInput">Specialty Food: '+
						'<input type="text" onkeyup="adminCommands.foodSpecialtyChanged(this)" placeholder="e.g: Japanese Cuisine">'+
					'</p>'+
					'<div class="adminTable">'+
						'<strong>Analytics Data:</strong>'+
						'<table>'+
							'<tr class="adminHeader">'+
								'<td>Month</td>'+
								'<td>Number of Customers</td>'+
								'<td>Revenue Amount (PHP)</td>'+
							'</tr>'+
							'<tr>'+
								'<td><a onclick="adminCommands.deleteRow(this)">-</a>'+
									'<input onblur="adminCommands.validateAllRows()" type="text" placeholder="January"></td>'+
								'<td><input onblur="adminCommands.validateAllRows()" type="number" placeholder="e.g: 500"></td>'+
								'<td><input onblur="adminCommands.validateAllRows()" type="number" placeholder="e.g: 1688"></td>'+
							'</tr>'+
						'</table>'+
						'<span class="adminAddNew"><a href="javascript:;" onclick="adminCommands.addNewRow()">Add New</a></span>'+
						'<p><input type="submit" class="adminSubmit"></p>'+
					'</div>'+
				'</form></div>';
			}
		},
		chartStyling: function(){
			return [
		        {
		            label: "Customers",
		            fillColor: "rgba(220,220,220,0.2)",
		            strokeColor: "rgba(220,220,220,1)",
		            pointColor: "rgba(220,220,220,1)",
		            pointStrokeColor: "#fff",
		            pointHighlightFill: "#fff",
		            pointHighlightStroke: "rgba(220,220,220,1)",
		        },
		        {
		            label: "Revenue (PHP x100)",
		            fillColor: "rgba(151,187,205,0.2)",
		            strokeColor: "rgba(151,187,205,1)",
		            pointColor: "rgba(151,187,205,1)",
		            pointStrokeColor: "#fff",
		            pointHighlightFill: "#fff",
		            pointHighlightStroke: "rgba(151,187,205,1)",
		        }
		    ];
		},
		directions: {
			outOfRange: 'You may need to be within '+ config.searchRadius +' meters from the City center.'
		}
	};

	var _root = window.exerciseObj = {
		
		init: function(){
			_root.backendHelper.waitDatabase(function(){
				_root.mapHelper.init();
				_root.nearbySearch.init();
				_root.restoCounter.init();
				_root.directionsHelper.init();
				_root.loading.delayedHiding(2);
				_root.loading.showHideFeatureWindows();
			});
		},
		
		loading: {
			show: loadingDiv.fadeIn.bind(loadingDiv),
			hide: loadingDiv.fadeOut.bind(loadingDiv),
			delayedHiding: function(secs){
				secs = secs*1;
				setTimeout(this.hide, secs*1000)
			},
			showHideFeatureWindows: function(){
				var _parent = this;
				$('#filters').mouseover(function(){
					if(this.hoverTimeout) clearTimeout(this.hoverTimeout);
					$(this).find('.featureWindow').show();
				}).mouseout(function(){
					var _this = this;
					this.hoverTimeout=setTimeout(function(){
						$(_this).find('.featureWindow').hide();
					}, 1000);
				});
				$('#directions .title').click(this.showHideDirectionsWindow);
				$('#directions .targetLocation > div').mouseover(function(){
					$(this).find('.close').show();
				}).mouseout(function(){
					$(this).find('.close').hide();
				});
			},
			capitalize: function(val){
				return val.charAt(0).toUpperCase()+val.substr(1).toLowerCase();
			},
			filtersRowTemplate: $('#filters .featureWindow div').remove(),
			searchStarted: function(){
				$('#filters').hide();
				$('#searching').show();
				$('#directions').hide();
			},
			searchEnded: function(){
				$('#filters').show();
				$('#directions').show();
				$('#restoCounter').show();
				$('#searching').hide();
			},
			showHideDirectionsWindow: function(forceHide){
				var $elem = $('#directions .title');
				var featureWindow = $elem.next();
				var isOpen = featureWindow.is(':visible');
				if(typeof(forceHide)==='boolean') isOpen=forceHide;
				if(isOpen) featureWindow.hide();
				else featureWindow.show();
			},
			shouldHideDirectionsWindow: function(){
				var _parent = this;
				var hideNow = function(){
					mapObj.clickedOne = false;
					_parent.showHideDirectionsWindow(true);
				};
				if( mapObj.clickedOne ) {
					mapObj.clickedOne = false;
					hideNow();
				} else {
					mapObj.clickedOne = true;
					setTimeout(function(){
						mapObj.clickedOne = false;
					}, 3000);
				}
			}
		},
		
		mapHelper: {
			init: function(){
				var _parent = this;
				initMapCenterObj = this.genLatLng(initMapCoords.lat, initMapCoords.lng);
				mapObj = new google.maps.Map(mapDiv, { center: initMapCenterObj, zoom: config.initZoomLevel });
				_root.eventsHelper.startListening(mapObj, 'click', function(){
					_parent.infoWindow.instance && _parent.infoWindow.instance.close();
					_root.loading.showHideDirectionsWindow(true);
		//			_root.loading.shouldHideDirectionsWindow();
				});
			},
			genLatLng: function(lat, lng){
				return new google.maps.LatLng(lat, lng)
			},
			addMarker: function(place){
				return new google.maps.Marker({
					map: mapObj,
					position: place.geometry.location,
					/*
				    icon: {
						url: 'http://maps.gstatic.com/mapfiles/circle.png',
						anchor: new google.maps.Point(10, 10),
						scaledSize: new google.maps.Size(20, 34)
					}
					*/
				});
			},
			infoWindow: {
				makeWindow: function(){
					this.instance = new google.maps.InfoWindow();
				},
				execService: function(){
					if(!this.instance) this.makeWindow();
					var args = Array.prototype.slice.call(arguments);
					var method=args.shift();
					this.instance[method].apply(this.instance, args);
				},
				makeCenter: function(marker){
					if(!marker) marker = _root.nearbySearch.currentItem.marker;
					this.execService('open',mapObj,marker)
				},
				compileContent: function(dataSource){
					var html = htmlTemplates.restoInfo;
					var _parent = this;
					return {
						html: '<div class="infoWindow">' +
								html.mainPage(dataSource) +
								html.manageButton() +
								html.adminPanel() +
							  '</div>',
						initCallback: function(currentItem){
							_root.mapHelper.isVisible({
								selector: "$('.infoWindow').parent().parent()"
							}, function($elem){
								$elem.parent().next().show(); // close button
								$elem.parent().prev().show(); // drop shadow
								$elem.parent().parent().removeClass('counterTextCss');
								$elem.css({ width: config.infoWindowSize.collapsed });
								$elem.parent().parent().css({transition:'all ease 0.3s'});
								_parent.updateDynamicViewOnlyData(currentItem);
								_parent.restoreAdminPanelInputData(currentItem);
								_parent.onlineOfflineDisplayFixes();
								_parent.onlineOfflineAdminPanelFixes();
				//				_root.backendHelper.watchServerRowForChanges(currentItem);
								setTimeout(function(){ _parent.makeCenter(); }, 100);
							});
						}
					};
				},
				onlineOfflineDisplayFixes: function(){
				
					var loading = function(){
						$('.loadingContactInfoBlock').show();
						
						$('.onlineContactInfoBlock').hide();
						$('.offlineContactInfoBlock').hide();
						
						$('.onlineRatingDataBlock').hide();
						$('.offlineRatingDataBlock').hide();
					};
					
					var display = function(){
						$('.loadingContactInfoBlock').hide();
						
						$('.onlineContactInfoBlock').show();
						$('.offlineContactInfoBlock').hide();
						
						$('.onlineRatingDataBlock').show();
						$('.offlineRatingDataBlock').hide();
					};
					
					var offline = function(){
						$('.loadingContactInfoBlock').hide();
						
						$('.onlineContactInfoBlock').hide();
						$('.offlineContactInfoBlock').show();
						
						$('.onlineRatingDataBlock').hide();
						$('.offlineRatingDataBlock').show();
					};
					
					var currentItem = _root.nearbySearch.currentItem;
					if( _root.eventsHelper.isOnline ) {
						if(currentItem && currentItem.detailsResult)
							display();
						else loading();
					} else {
						offline();
					}
				},
				onlineOfflineAdminPanelFixes: function(){
					if(_root.eventsHelper.isOnline) {
						$('.adminPanel input').removeAttr('disabled').animate({backgroundColor: '#fff'});
					} else {
						$('.adminPanel input').attr('disabled','disabled').animate({backgroundColor: '#F8F8F8'});
					}
				},
				updateDynamicViewOnlyData: function(currentItem){
					this.updateViewOnlySpecialtyFood(currentItem);
					_root.analyticsHelper.updateChart(currentItem);
				},
				updateViewOnlySpecialtyFood: function(currentItem){
					if(!currentItem.backendData) return;
					var specialtyDom = $('.specialty');
					var specialtyFood = currentItem.backendData.foodSpecialty;
					specialtyDom.find('strong').text(specialtyFood);
					if(specialtyFood) specialtyDom.show();
					else specialtyDom.hide();
				},
				restoreAdminPanelInputData: function(currentItem){
					this.restoreSpecialtyFoodTextfieldData(currentItem);
					this.restoreAdminPageGraphMatrix(currentItem);
				},
				restoreSpecialtyFoodTextfieldData: function(currentItem){
					var _parent = this;
					var insert = function(){
						var food = currentItem.backendData.foodSpecialty;
						$('.infoWindow .specialty strong').html(food);
						$('.specialtyFoodInput input').val(food);
					};
					if(currentItem.backendData) insert();
					else setTimeout(function(){
						_parent.restoreSpecialtyFoodTextfieldData(currentItem);
					}, 250);
				},
				restoreAdminPageGraphMatrix: function(currentItem){
					var _parent = this;
					var insert = function(){
						var chartData = currentItem.backendData.chartData;
						if( chartData.dontGraph ) return;
						var adminTable = $('.adminTable table');
						var exampleRow = adminTable.find('tr').last();
						exampleRow.remove();
						for(var i=0; i<chartData.labels.length; i++){
							var cloneCopy = exampleRow.clone();
							var rowData = [ chartData.labels[i] ];
							for(var j=0; j<chartData.datasets.length; j++) {
								rowData.push(chartData.datasets[j][i]);
							}
							cloneCopy.find('input').each(function(k){
								var input = $(this).val(rowData[k]);
							});
							adminTable.append(cloneCopy);
						}
						window.adminCommands.showHideRedButtons();
					};
					if(currentItem.backendData) insert();
					else setTimeout(function(){
						_parent.restoreAdminPageGraphMatrix(currentItem);
					}, 250);
				}
			},
			isVisible: function(target, callback){
				var interval = setInterval(function(){
					var $elem = $.type(target)==="string"?$(target):eval(target.selector);
					var isVisible = $elem.is(':visible');
					if(!isVisible) return;
					clearInterval(interval);
					callback($elem);
				}, 50);
			}
		},
		
		analyticsHelper: {
			updateChart: function(currentItem){
				this.clearCanvas();
				var chartElem = $('.analyticsChart');
				var chartElem2D = chartElem.get(0).getContext("2d");
				this.generateDataStructure(currentItem, function(structuredData){
					var myLineChart = new Chart(chartElem2D).Line(structuredData, {
						legendTemplate : htmlTemplates.restoInfo.legend()
					});
					var legendObj = myLineChart.generateLegend();
					var analyticsHolder = $('.analyticsHolder');
					var existingLegend = analyticsHolder.find('.legend');
					if(!existingLegend.length) analyticsHolder.append(legendObj);
					else existingLegend.replaceWith(legendObj);
				});
			},
			clearCanvas: function(){
				var chartElem = $('.analyticsChart');
				var newCanvasHTML = htmlTemplates.restoInfo.graphCanvas();
				chartElem.replaceWith(newCanvasHTML);
			},
			generateDataStructure: function(currentItem, callback){
				var _parent = this;
				var chartStyling = htmlTemplates.chartStyling();
				if(!currentItem.backendData) {
				console.warn('no backendData for chart, yet! (retrying)');
					setTimeout(function(){
						_parent.generateDataStructure(currentItem, callback);
					}, 250);
					return;
				}
				var backendChartData = currentItem.backendData.chartData;
				var outputStructure = { labels: backendChartData.labels, datasets:[] };
				for(var i=0; i<chartStyling.length; i++){
					var dataset = $.extend(true, {}, chartStyling[i]);
					var backendDataset = this.graphNumberFixes(
						i, backendChartData.datasets[i],
						backendChartData.dontGraph
					);
					if( backendDataset ) dataset.data = backendDataset;
					outputStructure.datasets.push(dataset);
				}
				callback(outputStructure);
			},
			graphNumberFixes: function(index, dataset, dontGraph){
				dataset = dataset || [];
				var output = [];
				for(var i=0; i<dataset.length; i++){
					var value = dataset[i];
					if( dontGraph ) value = null;
					if( index==1 ) value = value/100;	// divide Revenue by 100 --to make the graph look more interesting
					output.push(value);
				}
				return output;
			}
		},
		
		eventsHelper: {
			startListening: function(object, event, callback){
				google.maps.event.addListener(object, event, callback||function(){});
  			},
			online: function(){
				console.info('online');
				this.isOnline = true;
				$('#offline').fadeOut();
				$('#online').css({ top: 0, opacity: 1 });
				$('#map, .featureButtons').animate({ opacity: 1 });
				setTimeout(function(){
					$('#online').animate({ top:'-100px', opacity:0 });
				}, 2000);
				_root.mapHelper.infoWindow.onlineOfflineDisplayFixes();
				_root.mapHelper.infoWindow.onlineOfflineAdminPanelFixes();
				_root.nearbySearch.checkForDetails();
			},
			offline: function(){
				console.warn('offline');
				this.isOnline = false;
				$('#offline').fadeIn();
				$('#map').animate({ opacity: 0.6 });
				$('.featureButtons').animate({ opacity: 0.8 });
				_root.mapHelper.infoWindow.onlineOfflineDisplayFixes();
				_root.mapHelper.infoWindow.onlineOfflineAdminPanelFixes();
			},
			isOnline: false
  		},
  		
		nearbySearch: {
			restoTypes: [],
			resultsArray: [],
			serviceObj: null,
			currentItem: null,
			init: function(){
				_root.loading.searchStarted();
				this.serviceObj = new google.maps.places.PlacesService(mapObj);
				this.performSearch({
					location: initMapCenterObj,
					radius: config.searchRadius,
					types: ['restaurant']
				});
			},
			performSearch: function(request){
				var _parent = this;
				var numPagesProcessed = 0;
				console.info('searching for any', request.types, 'within the radius of ', request.radius, ' meters');
				var searchObj = this.serviceObj.nearbySearch(request, function(results, status, pagination) {
					if(status == google.maps.places.PlacesServiceStatus.OK) {
						numPagesProcessed = numPagesProcessed+1;
						console.log('results count: '+ results.length +' (page '+ numPagesProcessed +')');
						for(var i=0; i<results.length; i++) {
							(function(place, i){ // using closure to send correct data to callbacks for later use --not relying on "i"
								var marker = _root.mapHelper.addMarker(place);
								var itemData = { index:i, place:place, marker:marker, markerVisible:true, noDetails:true };
								_root.backendHelper.mergeWithMapsData(itemData);
								_parent.resultsArray.push(itemData);
								_parent.addToRestoTypes(place.types, itemData);
								_root.eventsHelper.startListening(marker, 'click', function(){
									_parent.markerClickHandler(itemData);
								});
							})(results[i], i);
						}
						if(pagination.hasNextPage) pagination.nextPage();
						else {
							console.info('total results collected: ', _parent.resultsArray.length);
							_parent.filtersList.updateDisplay();
						}
		//				_parent.getItemDetails.startSequence();
					} else console.error(status);
				});
			},
			addToRestoTypes: function(types, itemData){
				for(var i=0; i<types.length; i++){
					var found=false, type=types[i];
					for(var j=0; j<this.restoTypes.length; j++){
						if(type==this.restoTypes[j].name) {
							found = !found; break;
						}
					}
					if(found) this.restoTypes[j].items.push(itemData);
					else this.restoTypes.push({ name:type, items:[itemData] });
				}
			},
			getRestoTypeNames: function(){
				var names = [];
				for(var i=0; i< this.restoTypes.length; i++){
					names.push(this.restoTypes[i].name+','+i);
				}
				return names;
			},
			filtersList: {
				updateDisplay: function(){
					var filtersHolder = $('#filters .featureWindow').html('');
					var rowTemplate = _root.loading.filtersRowTemplate;
					var restoTypes = _root.nearbySearch.getRestoTypeNames().sort();
					for(var i=0; i<restoTypes.length; i++){
						var cloneCopy = rowTemplate.clone();
						filtersHolder.append(cloneCopy);
						(this.handleUI)(restoTypes[i],cloneCopy);
					}
					_root.loading.searchEnded();
				},
				handleUI: function(restoType, $elem){
					var _parent = this;
					var restoTypeArr = restoType.split(',');
					var restoTypeId = restoTypeArr[1];
					var restoCount = _root.nearbySearch.restoTypes[restoTypeId].items.length;
					var cleanedName = this.fixTitle(restoTypeArr[0]);
					$elem.find('input').attr('value', restoTypeId);
					$elem.find('span').html(cleanedName);
					$elem.find('em').html('('+restoCount+')');
					$elem.click(function(){
						$(this).find('input').trigger('click');
					});
					$elem.find('input').click(function(event){
						event.stopPropagation();
						_parent.applySelected();
					});
				},
				fixTitle: function(val){
					var outArr = [];
					var valArr = val.split('_');
					for(var i=0; i<valArr.length; i++){
						outArr.push( _root.loading.capitalize(valArr[i]) );
					}
					var output = outArr.join(' ');
					output = output.replace(/of/i, 'of');
					return output;
				},
				applySelected: function(){
					var _parent = this;
					this.hideAllMarkers();
					var infoWindow = _root.mapHelper.infoWindow;
					if( infoWindow.instance ) infoWindow.instance.close();
					$('#filters .featureWindow input:checked').each(function(){
						var restoIndex = this.value;
						var restoItems = _root.nearbySearch.restoTypes[restoIndex].items;
						for(var i=0; i<restoItems.length; i++){
							_parent.showHideSingleMarker(restoItems[i].marker, true, restoItems[i]);
						}
					});
					_root.restoCounter.updateCircleContent.changeHandler();
				},
				hideAllMarkers: function(){
					var allResults = _root.nearbySearch.resultsArray;
					for(var i=0; i<allResults.length; i++){
						this.showHideSingleMarker(allResults[i].marker, false, allResults[i]);
					}
				},
				showHideSingleMarker: function(marker, target, result){
					marker.setVisible(target);
					if(result) result.markerVisible=target;
				}
			},
			markerClickHandler: function(itemData){
				this.currentItem = itemData;
				console.log('currentItem: ', itemData);
				this.generateInfoWindow(itemData);
				this.getItemDetails.queryService(itemData);
				_root.directionsHelper.updateTargetLocation();
			},
			generateInfoWindow: function(itemData){
				var result = itemData.detailsResult || itemData.place;
				var infoWindowHelper = _root.mapHelper.infoWindow;
				var content = infoWindowHelper.compileContent(result);
				infoWindowHelper.execService('setContent', content.html);
				infoWindowHelper.makeCenter(itemData.marker);
				content.initCallback(itemData);
			},
			getItemDetails: {
				totalResponses: 0,
				totalNumQueries: 0,
				startSequence: function(){
					var resultsArray = _root.nearbySearch.resultsArray;
					this.totalNumQueries = 0;
					for(var i=0; i<resultsArray.length; i++){
						if(this.totalNumQueries>=9) break;
						var resultItem = resultsArray[i];
						if(resultItem.noDetails) {
							this.totalNumQueries = this.totalNumQueries+1;
							this.queryService(resultItem);
						}
					}
				},
				cleanUpSequence: function(itemData){
					var currentItem = _root.nearbySearch.currentItem;
					if( currentItem && currentItem.place.id==itemData.place.id )
						_root.nearbySearch.generateInfoWindow(itemData);
					this.totalResponses = this.totalResponses+1;
					if(this.totalResponses>=this.totalNumQueries) {
						this.totalResponses=0;
		//				setTimeout(this.startSequence.bind(this), 500);
					}
				},
				queryService: function(itemData){
					var _parent = this;
					if(itemData.detailsResult) return;
					_root.nearbySearch.serviceObj.getDetails(itemData.place, function(result, status) {
						if(status == google.maps.places.PlacesServiceStatus.OK) {
							console.log('getDetails result: ', result);
							itemData.noDetails = false;
							itemData.detailsResult = result;
							_root.directionsHelper.updateTargetLocation();
						} else {
							console.error(status);
						}
						_parent.cleanUpSequence(itemData);
					});
				}
			},
			checkForDetails: function(){
				// used only if the user clicks on an item while offline then suddenly goes online --item should get details and update screen
				if(!this.currentItem) return;
				this.getItemDetails.queryService(this.currentItem);
			}
		},
		
		directionsHelper: {
			currentOrigin: null,
			currentTarget: null,
			hasAllowedAccess: false,
			routesPanelOpened: false,
			init: function(){
				this.domUtils.init();
				this.geoCode.init();
				this.direction.init();
			},
			askForLocation: function(){
				var _parent = this;
				this.currentOrigin = null;
				this.domUtils.sectionsHelper.currentLocation.loading.show();
				navigator.geolocation.getCurrentPosition(function(location){
					console.log('geolocation: ', location);
					_parent.hasAllowedAccess = true;
					_parent.geoCode.query(location, false, function(data){	// todo: should keep trying if got GEOMETRIC_CENTER?
						if(!data.error) {
							if( _parent.geoCode.withinRange(data.results[0]) )
								_parent.currentOrigin = data.result = data.results[0];
							else data.error = htmlTemplates.directions.outOfRange;
						}
						_parent.domUtils.updateAddressDisplay(data);
						_parent.direction.isReady();
					});
				}, function(error){
					_parent.hasAllowedAccess = false;
					_parent.domUtils.sectionsHelper.currentLocation.loading.show('.denyLocation');
					_parent.domUtils.sectionsHelper.actionButtonsHolder.hide();
					_parent.domUtils.sectionsHelper.targetLocation.hide();
				});
				_parent.domUtils.sectionsHelper.actionButtonsHolder.hide();
				_parent.updateTargetLocation(true);
			},
			geoCode: {
				instance: null,
				init: function(){
					this.instance = new google.maps.Geocoder();
				},
				query: function(location, skipInterpolated, callback){
					var _main = _root.directionsHelper;
					var _parent = _main.geoCode;
					_parent.instance.geocode({'location': {
						lat: location.coords.latitude,
						lng: location.coords.longitude
						/* mactan airport */
			//			lat: 10.319745,
			//			lng: 123.984024
						/* mactan reef (ocean) */
			//			lat: 10.281418,
			//			lng: 123.914354
					}}, function(results, status) {
						var data = {};
						console.log('geocode response: ', status, results);
						if(status==google.maps.GeocoderStatus.OK) {
							data.results = results;
							var locType = results[0].geometry.location_type;
							console.info(locType+':', results[0].formatted_address);
							if(skipInterpolated && locType=='RANGE_INTERPOLATED')
								setTimeout(function(){
									_parent.query(location, skipInterpolated, callback);
								}, 2000);
							else callback(data);
						} else {
							data.error = status;
							callback(data);
						}
					});
				},
				withinRange: function(result){
					var currentLatLng = {
						lat: result.geometry.location.lat(),
						lng: result.geometry.location.lng()
					};
					var userDistance = this.computeDistance(initMapCoords, currentLatLng);
					console.info('userDistance: ', userDistance);
					return userDistance <= config.searchRadius;
				},
				computeDistance: function(p1, p2){
					var rad = function(x){ return x * Math.PI/180 };
					var R = 6378137; // Earth’s mean radius in meter
					var dLat = rad(p2.lat - p1.lat);
					var dLong = rad(p2.lng - p1.lng);
					var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
						Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
						Math.sin(dLong / 2) * Math.sin(dLong / 2);
					var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
					var d = R * c;
					return d; // returns the distance in meter
				}
			},
			setCenterCurrentLocation: function(){
				if(!this.currentOrigin) return;
				var location = this.currentOrigin.geometry.location;
				mapObj.setCenter(location);
				mapObj.setZoom(18);
				/*
				var marker = new google.maps.Marker({
					map: mapObj, position: location
				});
				*/
			},
			updateTargetLocation: function(skipReplace){
				var currentItem = _root.nearbySearch.currentItem;
				if(!currentItem || !currentItem.detailsResult) { // abort and wait for the detailsResult response
					this.removeTargetLocation();
					return;
				} 
				var data = {
					name: currentItem.detailsResult.name,
					address: currentItem.detailsResult.formatted_address
				};
				if(!skipReplace) {
					this.currentTarget = currentItem;
					this.domUtils.sectionsHelper.targetLocation.targetAddress.show(data);
				}
				this.direction.isReady();
			},
			showTargetPinDetails: function(){
				var currentItem = _root.nearbySearch.currentItem;
				_root.nearbySearch.markerClickHandler(currentItem);
			},
			removeTargetLocation: function(){
				_root.directionsHelper.currentTarget=null;
				this.domUtils.sectionsHelper.targetLocation.noTarget.show();
				this.domUtils.showHideRoutes(false);
				this.direction.renderer.setMap(null);
				this.direction.isReady();
			},
			direction: {
				service: null,
				renderer: null,
				init: function(){
					this.service = new google.maps.DirectionsService();
					this.renderer = new google.maps.DirectionsRenderer();
					this.renderer.setPanel($('#routesDisplay').get(0));
				},
				isReady: function(){
					var _main = _root.directionsHelper;
					if( _main.currentOrigin && _main.currentTarget ) {
						_main.domUtils.sectionsHelper.actionButtonsHolder.startReady.show();
					} else {
						_main.domUtils.sectionsHelper.actionButtonsHolder.startEmpty.show();
					}
				},
				query: function(request, callback){
					var _parent = this;
					this.service.route(request, callback);
				}
			},
			getTravelMode: function(){
				var mode = directionsCommands.travelModeChanged(null, true);
				return google.maps.TravelMode[mode];
			},
			travelModeChanged: function(value){
				this.domUtils.showHideRoutes(false);
				this.direction.renderer.setMap(null);
				this.direction.isReady();
			},
			startSearching: function(){
				var startLocation = this.currentOrigin;
				var targetLocation = this.currentTarget;
				if(!startLocation || !targetLocation) return;
				this.domUtils.sectionsHelper.actionButtonsHolder.startFinding.show();
				_root.mapHelper.infoWindow.instance.close();
				var origin = _root.mapHelper.genLatLng({
					lat: startLocation.geometry.location.lat(),
					lng: startLocation.geometry.location.lng(),
				});
				var destination = _root.mapHelper.genLatLng({
					lat: targetLocation.detailsResult.geometry.location.lat(),
					lng: targetLocation.detailsResult.geometry.location.lng(),
				});
				this.domUtils.routeSearchError.hide();
				this.direction.query({
					origin: origin,
					destination: destination,
					travelMode: this.getTravelMode()
				}, this.finishedSearching);
			},
			finishedSearching: function(result, status){
				var _main = _root.directionsHelper;
				console.log('routes: ', result, status);
				if(status == google.maps.DirectionsStatus.OK) {
					_main.routesPanelOpened = true;
					_root.loading.showHideDirectionsWindow(true);
					var currentItem = _main.currentTarget.detailsResult;
					_main.domUtils.showHideRoutes(true, {
						name: currentItem.name,
						address: currentItem.formatted_address
					});
					_main.direction.renderer.setMap(mapObj);
					_main.direction.renderer.setDirections(result);
				} else {
					_main.domUtils.routeSearchError.show(status);
					_main.domUtils.sectionsHelper.actionButtonsHolder.startReady.show();
				}
			},
			domUtils: {
				hasGeolocation: !!window.navigator && !!navigator.geolocation,
				init: function(){
					var _parent = this;
					var _main = _root.directionsHelper;
					$('#directions .title').click(function(){
						mapObj.clickedOne = false;
						if(_parent.hasGeolocation) {
							var panel = $('#directions .featureWindow');
							var isVisble = panel.is(':visible');
							if(!isVisble) _main.askForLocation();
							_parent.routeSearchError.hide();
						} else {
							_parent.sectionsHelper.targetLocation.hide();
							_parent.sectionsHelper.actionButtonsHolder.hide();
							_parent.sectionsHelper.currentLocation.loading.show('.noGeolocation');
						}
					});
					$('.targetLocation .close').click(function(event){
						event.stopPropagation();
						_root.directionsHelper.removeTargetLocation();
						_root.mapHelper.infoWindow.instance.close()
					});
				},
				updateAddressDisplay: function(data){
					if(data.error) this.sectionsHelper.currentLocation.error(data.error);
					else this.sectionsHelper.currentLocation.address(data.result.formatted_address);
				},
				sectionsHelper: {
					currentLocation: {
						loading: {
							show: function(showThis){
								showThis = showThis || '.spinner';
								var spinnerHolder = '.currentLocation .spinnerHolder ';
								$('.currentLocation .error').hide();
								$('.currentLocation .addressHolder').hide();
								$(spinnerHolder).show().children().hide();
								$(spinnerHolder+showThis).show();
							}
						},
						address: function(value){
							$('.currentLocation .error').hide();
							$('.currentLocation .spinnerHolder').hide();
							$('.currentLocation .addressHolder').show().children().html(value);
						},
						error: function(value){
							$('.currentLocation .spinnerHolder').hide();
							$('.currentLocation .addressHolder').hide();
							$('.currentLocation .error').show().html(value);
						}
					},
					targetLocation: {
						targetAddress: {
							show: function(data){
								var targetLocation = $('.targetLocation').show();
								var targetAddress = targetLocation.find('.targetAddress').show();
								targetLocation.find('.noTarget').hide();
								targetAddress.find('.name').html(data.name);
								targetAddress.find('.address').html(data.address);
							}
						},
						noTarget: {
							show: function(){
								var targetLocation = $('.targetLocation').show();
								targetLocation.find('.targetAddress').hide();
								targetLocation.find('.noTarget').show();
							}
						},
						hide: function(){ $('.targetLocation').hide() }
					},
					actionButtonsHolder: {
						startEmpty: {
							show:function(){
								var actionButtonsHolder = $('.actionButtonsHolder').show();
								actionButtonsHolder.find('.startFinding').hide();
								actionButtonsHolder.find('.startReady').hide();
								actionButtonsHolder.find('.startEmpty').show();
							}
						},
						startReady: {
							show:function(){
								var actionButtonsHolder = $('.actionButtonsHolder').show();
								actionButtonsHolder.find('.startFinding').hide();
								actionButtonsHolder.find('.startReady').show();
								actionButtonsHolder.find('.startEmpty').hide();
							}
						},
						startFinding: {
							show:function(){
								var actionButtonsHolder = $('.actionButtonsHolder').show();
								actionButtonsHolder.find('.startFinding').show();
								actionButtonsHolder.find('.startReady').hide();
								actionButtonsHolder.find('.startEmpty').hide();
							}
						},
						hide: function(){
							$('.actionButtonsHolder').hide();
						}
					}
				},
				routeSearchError: {
					hide: function(){
						$('.routeSearchError').hide();
					},
					show: function(msg){
						$('.routeSearchError').show().find('span').html(msg);
					}
				},
				showHideRoutes: function(shouldShow, data, callback){
					data = data || {};
					var docWidth = $(document).width();
					var panelWidth = $('#directionsPanel').width()+21;
					var mapTarg = shouldShow? (docWidth-panelWidth)+'px' : '100%';
					var panelTarg = shouldShow? 0 : '-'+panelWidth+'px';
					$('.targDestAddName strong').html(data.name);
					$('.targDestAdd').html(data.address);
					$('#mapHolder').animate({width: mapTarg});
					$('#directionsPanel').animate({left: panelTarg}, {
						complete: function(){
							google.maps.event.trigger(mapObj, 'resize');
							if(callback) callback();
							
							// todo: mapObj.panTo(searchAreaMarker.getPosition());
							
						}
					});
				}
			}
		},
		
		backendHelper: {
			dbInstance: null,
			startingDataTemplate: {
				foodSpecialty: '',
				chartData: {
					labels: ['', 'No Data to Graph', ''],
					datasets: [ [0] ],
					dontGraph: true
				}
			},
			stateChecker: {
				init: function(serverStatusUrl, initCallback){
					var _parent = this;
					var executedCallback = false;
					var serverStatusObj = new Firebase(serverStatusUrl);
					serverStatusObj.on('value', function(snapshot) {
						if(snapshot.val()) {
							if(!executedCallback){
								executedCallback=true;
								initCallback();
							}
							_root.eventsHelper.online();
						} else {
							_root.eventsHelper.offline();
						}
					});
				}
			},
			waitDatabase: function(callback){
				var firebaseUrl = config.firebase.baseUrl;
				var serverStatusUrl = config.firebase.stateUrl;
				this.dbInstance = new Firebase(firebaseUrl);
				this.stateChecker.init(firebaseUrl+serverStatusUrl,function(){
					setTimeout(callback, 500);
				});
			},
			getData: function(id, callback){
				this.dbInstance.child(id).on("value", function(snapshot) {
					callback(snapshot.val());
				});
			},
			updateDatabase: function(id, data){
				this.dbInstance.child(id).set(data);
			},
			mergeWithMapsData: function(resultItem){
				var emptyDataSample = this.startingDataTemplate;
				this.getData(resultItem.place.id, function(data){
					resultItem.backendData = data || emptyDataSample;
				});
			},
			replaceColumnWithNewData: function(targetObj, data, callback){
				var currentItem = _root.nearbySearch.currentItem;
				currentItem.backendData[targetObj] = data;
				this.updateDatabase(currentItem.place.id, currentItem.backendData);
				callback(currentItem);
			},
			collectSpecialtyFoodData: function(value){
				this.replaceColumnWithNewData('foodSpecialty', value, function(currentItem){
					_root.mapHelper.infoWindow.updateViewOnlySpecialtyFood(currentItem);
				});
			},
			collectChartDataset: function(newchartData){
				this.replaceColumnWithNewData('chartData', newchartData, function(currentItem){
					_root.mapHelper.infoWindow.updateDynamicViewOnlyData(currentItem);
				});
			},
			watchServerRowForChanges: function(currentItem){
				/*
				this.dbInstance.child(currentItem.place.id).on('child_changed',
					function(childSnapshot, prevChildKey) {
						var whichColumn = childSnapshot.ref().toString()
											.replace(config.firebase.baseUrl,'')
											.replace(currentItem.place.id, '')
											.replace('/','');
						if(whichColumn=='foodSpecialty') {
							_root.mapHelper.infoWindow.updateViewOnlySpecialtyFood(currentItem);
							_root.mapHelper.infoWindow.restoreAdminPanelInputData(currentItem);
						}
					}
				);
				*/
			}
		},
		
		restoCounter: {
			circleInstance: null,
			labelInstance: null,
			init: function(){
				var _parent = this;
				$('#restoCounter .title').click(function(){
					var pressedClass = 'restoCounterDepressed';
					var active = $(this).hasClass(pressedClass);
					if(!active) {
						$(this).addClass(pressedClass);
						_parent.showCircle();
					} else {
						$(this).removeClass(pressedClass);
						_parent.hideCircle();
					}
				});
				var circle = _parent.circleInstance = new google.maps.Circle({
		//			center: '',
		//			map: mapObj,
					fillColor: '#99f',
					fillOpacity: 0.5,
					strokeColor: '#99f',
		//			strokeOpacity: 1.0,
					strokeWeight: 2,
					draggable: true,
					editable: true
			    });
			   _parent.labelInstance = new google.maps.InfoWindow({
			        content: '<div id="counterText"></div>',
			        disableAutoPan: true,
			    });
		//		label.open(mapObj);
			    google.maps.event.addListener(circle, 'center_changed', _parent.updateCircleContent.changeHandler);
			    google.maps.event.addListener(circle, 'radius_changed', _parent.updateCircleContent.changeHandler);
			},
			updateCircleCoords: function(){
					var bounds = mapObj.getBounds();
					var center = mapObj.getCenter();
					var neCorner = bounds.getNorthEast();
					var radius = google.maps.geometry.spherical.computeDistanceBetween(center, neCorner);
					this.circleInstance.setCenter(center);
					this.circleInstance.setRadius(radius / 2);
			},
			showCircle: function(){
				this.updateCircleCoords();
				this.labelInstance.setMap(mapObj);
				this.circleInstance.setMap(mapObj);
				this.updateCircleContent.changeHandler();
			},
			hideCircle: function(){
				this.circleInstance.setMap(null);
				this.labelInstance.setMap(null);
			},
			updateCircleContent: {
				changeHandler: function(){
					var _main = _root.restoCounter;
					var _this = _main.updateCircleContent;
					var circle = _main.circleInstance;
					var label = _main.labelInstance;
					var restoCount = _this.countRestosWithin(circle);
					label.setPosition(circle.getCenter());
					if(restoCount==0) _this.replaceLabelContent('No Restaurants here :)');
					else if(restoCount==1) _this.replaceLabelContent(restoCount+' Restaurant');
					else _this.replaceLabelContent(restoCount+' Restaurants');
				},
				countRestosWithin: function(circle){
					var restoCount = 0;
					var currentCircleCenter = circle.getCenter();
					var currentCircleRadius = circle.getRadius();
					var resultsArray = _root.nearbySearch.resultsArray;
					for(var i=0; i<resultsArray.length; i++) {
						var resultItem = resultsArray[i];
						if( resultItem.markerVisible ){
							var itemPosition = resultItem.marker.getPosition();
							var itemDistance = google.maps.geometry.spherical.computeDistanceBetween(currentCircleCenter, itemPosition);
							if( itemDistance <= currentCircleRadius ) restoCount++;
						}
					}
					return restoCount;
				},
				replaceLabelContent: function(text){
					var counterText = $('#counterText');
					counterText.parent().parent().parent().parent().addClass('counterTextCss'); //holder
					counterText.parent().parent().parent().next().hide(); // arrow
					counterText.parent().parent().parent().prev().hide(); // close button
					counterText.parent().parent().css({width:'auto'});
					counterText.html(text);
				}
			}
		}
		
	};
	
	window.directionsCommands = {
		openPanel: function(){
			if(!window.adminCommands.isOnline()) return;
			if($('#directions .featureWindow').is(':visible')) return;
			$('#directions .title').trigger('click');
		},
		travelModeChanged: function(elem, raw){
			elem = elem || '.featureWindow select';
			var value = $(elem).val();
			if(raw) return value;
			value = _root.loading.capitalize(value);
			$(	'#directions .title span,'+
				'.currentLocation .denyLocation span,'+
				'.infoWindow .directionsLink span'
			).html(value);
			_root.directionsHelper.travelModeChanged(value);
			return value;
		},
		currentLocation: function(){
			_root.directionsHelper.setCenterCurrentLocation();
			
			// todo: show marker? or rely on routeService~
		},
		showTargetPin: function(){
			_root.directionsHelper.showTargetPinDetails();
		},
		queryDirections: function(){
			_root.directionsHelper.startSearching();
		}
		
		
	};
	
	window.infoWindowCommands = {
		confirmNewWin: function(url){
			var confirm = window.confirm('Open Reviews on Google Maps?');
			if(confirm) window.open(url, '_blank');
		},
		manageButtonOnclick: function(elem, disableCb){
			var $elem = $(elem);
			var hasExpanded = $elem.attr('hasExpanded') * 1;
			var infoWindowHolder = $elem.parent().parent().parent().parent();
			var targetWidth = (hasExpanded? config.infoWindowSize.collapsed : config.infoWindowSize.expanded)+'px';
			$elem.attr('hasExpanded', hasExpanded?0:1).find('span').text(hasExpanded?'>':'<');
			infoWindowHolder.animate({ width: targetWidth }, {
				complete: function(){
					var currentItem = _root.nearbySearch.currentItem;
					_root.mapHelper.infoWindow.makeCenter(currentItem.marker);
				}
			});
		},
		currentlyOffline: function(){
			window.adminCommands.isOnline();
		}
	};
	
	window.adminCommands = {
		isOnline: function(){
			if(!_root.eventsHelper.isOnline) {
				$('#offline').effect('shake');
				return false;
			}
			return true;
		},
		foodSpecialtyChanged: function(textfield){
			var value = $(textfield).val();
			_root.backendHelper.collectSpecialtyFoodData(value);
		},
		addNewRow: function(){
			if(!this.isOnline()) return;
			var prevRowValid = this.validateAllRows(false);
			if(!prevRowValid) {
				this.checkForMultipleInvalidFields(1);
				return;
			}
			var adminPanel = $('.adminPanel');
			var adminTable = $('.adminTable table');
			var exampleRow = adminTable.find('tr').last();
			var cloneCopy = exampleRow.clone();
			var newInput = cloneCopy.find('input');
			newInput.val('').removeClass('validationError');
			adminTable.append(cloneCopy);
			this.showHideRedButtons();
			newInput.first().focus();
			adminPanel.animate({ scrollTop: adminTable.height() });
		},
		validateAllRows: function(focusPrevInvalidFields){
			focusPrevInvalidFields = focusPrevInvalidFields || true;
			var _parent = this;
			var allValid = true;
			var allRows = $('.adminTable tr').not('.adminHeader');
			var forOutput = { labels:[], datasets:[ [], [] ] };
			allRows.each(function(){
				var data = _parent.validateSingleRow(this);
				if(!data ) allValid = false;
				forOutput.labels.push(data[0]);
				forOutput.datasets[0].push(data[1]);
				forOutput.datasets[1].push(data[2]);
			});
			if(focusPrevInvalidFields) this.checkForMultipleInvalidFields();
			if(allValid) _root.backendHelper.collectChartDataset(forOutput)
			return allValid;
		},
		validateSingleRow: function(tr){
			var allInputs = $(tr).find('input');
			var validRow = true;
			var data = [];
			for(var i=0; i<allInputs.length; i++){
				var input = $(allInputs[i]);
				var inputVal = input.val();
				if( inputVal ) {
					data.push(inputVal);
					input.removeClass('validationError');
				} else {
					validRow = false;
					input.addClass('validationError');
				}
			}
			return validRow? data : false;
		},
		checkForMultipleInvalidFields: function(minimum){
			minimum = minimum || 4;
			var invalidFields = $('.validationError');
			if(invalidFields.length>=minimum) invalidFields.first().focus();
		},
		deleteRow: function(elem){
			if(!this.isOnline()) return;
			$(elem).parent().parent().remove();
			this.showHideRedButtons();
			this.validateAllRows(false);
			this.checkForMultipleInvalidFields(1);
		},
		showHideRedButtons: function(){
			var headerAndRows = $('.adminTable tr');
			var deleteButtons = headerAndRows.find('td a');
			deleteButtons[(headerAndRows.length>2)?'show':'hide']();
		},
		submitForm: function(){
			$('input').blur();
			return false;
		}
	};

})(
	$('#loading'),		//$loadingScreen
	$('#map').get(0),	//mapDiv
	{lat: 10.3095327, lng: 123.8932776}	//init center coords
);


























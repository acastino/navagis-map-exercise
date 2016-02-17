/*

	You may not copy, distribute or publish any portion of this script.
	
	Created for Navagis, Inc.
	by: a.castino@gmail.com

	All Rights, Reserved.
	
*/


(function(loadingDiv, mapDiv, initMapCoords, initMapCenterObj, mapObj){

	var config = {
		initZoomLevel: 15,
		searchRadius: 5000,	//meters	//maxlimit: 50000
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
							'<img src="images/loading-contact-details.gif" title="Loading Contact Details">'+
						'</div>'+
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
		            label: "Revenue (PHP)",
		            fillColor: "rgba(151,187,205,0.2)",
		            strokeColor: "rgba(151,187,205,1)",
		            pointColor: "rgba(151,187,205,1)",
		            pointStrokeColor: "#fff",
		            pointHighlightFill: "#fff",
		            pointHighlightStroke: "rgba(151,187,205,1)",
		        }
		    ];
		}
	};

	var _root = window.exerciseObj = {
		
		init: function(){
			_root.backendHelper.waitDatabase(function(){
				_root.mapHelper.init();
				_root.nearbySearch.init();
				_root.loading.delayedHiding(2);
				_root.loading.showHideFilters();
			});
		},
		
		loading: {
			show: loadingDiv.fadeIn.bind(loadingDiv),
			hide: loadingDiv.fadeOut.bind(loadingDiv),
			delayedHiding: function(secs){
				secs = secs*1;
				setTimeout(this.hide, secs*1000)
			},
			filterHoverTimeout: null,
			showHideFilters: function(){
				var _parent = this;
				$('#filters').mouseover(function(){
					if(_parent.filterHoverTimeout) clearTimeout(_parent.filterHoverTimeout);
					$(this).find('.filterOptions').show();
				}).mouseout(function(){
					var _this = this;
					_parent.filterHoverTimeout=setTimeout(function(){
						$(_this).find('.filterOptions').hide();
					}, 1000);
				});
			},
			filtersRowTemplate: $('.filterOptions div').remove()
		},
		
		mapHelper: {
			init: function(){
				var _parent = this;
				initMapCenterObj = this.genLatLng(initMapCoords.lat, initMapCoords.lng);
				mapObj = new google.maps.Map(mapDiv, { center: initMapCenterObj, zoom: config.initZoomLevel });
				_root.eventsHelper.startListening(mapObj, 'click', function(){
					_parent.infoWindow.instance && _parent.infoWindow.instance.close();
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
								$elem.css({ width: config.infoWindowSize.collapsed });
								$elem.parent().parent().css({transition:'all ease 0.3s'});
								_parent.updateDynamicViewOnlyData(currentItem);
								_parent.restoreAdminPanelInputData(currentItem);
								_parent.onlineOfflineDisplayFixes();
								_parent.onlineOfflineAdminPanelFixes();
				//				_root.backendHelper.watchServerRowForChanges(currentItem);
							});
						}
					};
				},
				onlineOfflineDisplayFixes: function(){
				
					var loading = function(){
						$('.loadingContactInfoBlock').hide();
						
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
					var specialtyFood = currentItem.backendData.foodSpecialty;
					var specialtyDom = $('.specialty').show();
					specialtyDom.find('strong').text(specialtyFood);
					if(specialtyFood) specialtyDom.show();
					else specialtyDom.hide();
				},
				restoreAdminPanelInputData: function(currentItem){
					this.restoreSpecialtyFoodTextfieldData(currentItem);
					this.restoreAdminPageGraphMatrix(currentItem);
				},
				restoreSpecialtyFoodTextfieldData: function(currentItem){
					var input = $('.specialtyFoodInput input')
					input.val(currentItem.backendData.foodSpecialty);
				},
				restoreAdminPageGraphMatrix: function(currentItem){
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
				var structuredData = this.generateDataStructure(currentItem);
				var myLineChart = new Chart(chartElem2D).Line(structuredData, {
					legendTemplate : htmlTemplates.restoInfo.legend()
				});
				var legendObj = myLineChart.generateLegend();
				chartElem.parent().append(legendObj);
			},
			clearCanvas: function(){
				var chartElem = $('.analyticsChart');
				var newCanvasHTML = htmlTemplates.restoInfo.graphCanvas();
				chartElem.replaceWith(newCanvasHTML);
			},
			generateDataStructure: function(currentItem){
				var chartStyling = htmlTemplates.chartStyling();
				var backendChartData = currentItem.backendData.chartData;
				var outputStructure = { labels: backendChartData.labels, datasets:[] };
				for(var i=0; i<chartStyling.length; i++){
					var dataset = $.extend(true, {}, chartStyling[i]);
					var backendDataset = backendChartData.datasets[i];
					if( backendDataset ) dataset.data = backendDataset;
					outputStructure.datasets.push(dataset);
				}
				return outputStructure;
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
				$('#map, #filters').animate({ opacity: 1 });
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
				$('#filters').animate({ opacity: 0.8 });
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
								var itemData = { index:i, place:place, marker:marker, noDetails:true };
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
					var filtersHolder = $('.filterOptions').html('');
					var rowTemplate = _root.loading.filtersRowTemplate;
					var restoTypes = _root.nearbySearch.getRestoTypeNames().sort();
					for(var i=0; i<restoTypes.length; i++){
						var cloneCopy = rowTemplate.clone();
						filtersHolder.append(cloneCopy);
						(this.handleUI)(restoTypes[i],cloneCopy);
					}
					$('#filters').show();
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
						outArr.push( this.capitalize(valArr[i]) );
					}
					var output = outArr.join(' ');
					output = output.replace(/of/i, 'of');
					return output;
				},
				capitalize: function(val){
					return val.charAt(0).toUpperCase()+val.substr(1).toLowerCase();
				},
				applySelected: function(){
					var _parent = this;
					this.hideAllMarkers();
					var infoWindow = _root.mapHelper.infoWindow;
					if( infoWindow.instance ) infoWindow.instance.close();
					$('.filterOptions input:checked').each(function(){
						var restoIndex = this.value;
						var restoItems = _root.nearbySearch.restoTypes[restoIndex].items;
						for(var i=0; i<restoItems.length; i++){
							_parent.showHideSingleMarker(restoItems[i].marker, true);
						}
					});
				},
				hideAllMarkers: function(){
					var allResults = _root.nearbySearch.resultsArray;
					for(var i=0; i<allResults.length; i++){
						this.showHideSingleMarker(allResults[i].marker, false);
					}
				},
				showHideSingleMarker: function(marker, target){
					marker.setVisible(target);
				}
			},
			markerClickHandler: function(itemData){
				this.currentItem = itemData;
				console.log('currentItem: ', itemData);
				this.generateInfoWindow(itemData);
				this.getItemDetails.queryService(itemData);
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
						} else {
							console.error(status);
						}
						_parent.cleanUpSequence(itemData);
					});
				}
			},
			checkForDetails: function(){
				// used only is the user clicks on an item while offline then suddenly goes online --item should get details and update screen
				if(!this.currentItem) return;
				this.getItemDetails.queryService(this.currentItem);
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
				this.stateChecker.init(firebaseUrl+serverStatusUrl,callback);
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


























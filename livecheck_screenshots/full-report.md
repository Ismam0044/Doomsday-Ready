# Live-site Playwright results

Live target: https://doomsday-ready-one.vercel.app

Results include 121 checks. The raw API objects and original before/after arrays are in [full-output.json](./full-output.json). Screenshots are in this folder.

| # | Test | Input | Expected | Actual | Result |
|---:|---|---|---|---|---|
| 1 | Live home | GET / | HTTP 200, Movies view | HTTP 200 Movies · Doomsday Ready | PASS |
| 2 | Before data snapshot | /api/movies and /api/cinemas | Saved baseline plus tracked TEST ids only | {"baselineMovies":9,"startedMovies":55,"cinemas":2,"unexpected":[]} | PASS |
| 3 | Booking add cinema button | TEST Final 1795207932555 UI cinema sizes 2,5 | 201 and immediately listed in picker | {"status":201,"data":{"id":17,"name":"TEST Final 1795207932555 UI cinema","bundleSizes":[2,5]},"visible":false} | FAIL |
| 4 | Movie validation empty title | {"title":"","releaseYear":2020,"runtime":100} | 400 invalid | {"status":400,"data":{"error":"Title is required."}} | PASS |
| 5 | Movie validation duplicate title | {"title":"TEST Livecheck 1795206174385 max","releaseYear":2020,"runtime":100} | 409 duplicate | {"status":409,"data":{"error":"That title or cinema name is already in use."}} | PASS |
| 6 | Movie validation runtime 0 | {"title":"TEST Final 1795207932555 bad 0","releaseYear":2020,"runtime":0} | 400 invalid | {"status":400,"data":{"error":"Runtime must be a whole number from 1 to 300."}} | PASS |
| 7 | Movie validation runtime 301 | {"title":"TEST Final 1795207932555 bad 301","releaseYear":2020,"runtime":301} | 400 invalid | {"status":400,"data":{"error":"Runtime must be a whole number from 1 to 300."}} | PASS |
| 8 | Movie validation runtime negative | {"title":"TEST Final 1795207932555 bad negative","releaseYear":2020,"runtime":-1} | 400 invalid | {"status":400,"data":{"error":"Runtime must be a whole number from 1 to 300."}} | PASS |
| 9 | Movie validation runtime text | {"title":"TEST Final 1795207932555 bad text","releaseYear":2020,"runtime":"abc"} | 400 invalid | {"status":400,"data":{"error":"Runtime must be a whole number from 1 to 300."}} | PASS |
| 10 | Movie validation missing year | {"title":"TEST Final 1795207932555 missing year","runtime":100} | 400 invalid | {"status":400,"data":{"error":"Release year must be a whole number from -9007199254740991 to 9007199254740991."}} | PASS |
| 11 | Circular self API | TEST id 106 ? itself | 409 CIRCULAR_DEPENDENCY | {"status":409,"data":{"error":"This change would create a circular dependency.","code":"CIRCULAR_DEPENDENCY"}} | PASS |
| 12 | Circular two movie loop | TEST 106?107, then 107?106 | First 200, second 409 CIRCULAR_DEPENDENCY | {"first":{"status":200,"data":{"id":106,"title":"TEST Final 1795207932555 two A","releaseYear":2043,"runtime":120,"watched":false,"prerequisites":[107]}},"second":{"status":409,"data":{"error":"This change would create a circular dependency.","code":"CIRCULAR_DEPENDENCY"}}} | PASS |
| 13 | Circular three movie loop | TEST 111?112?108?111 | First two 200, last 409 CIRCULAR_DEPENDENCY | {"first":200,"second":200,"last":{"status":409,"data":{"error":"This change would create a circular dependency.","code":"CIRCULAR_DEPENDENCY"}}} | PASS |
| 14 | TEST Endgame into TEST Iron Man | TEST Avengers: Doomsday as prerequisite of TEST Iron Man | 409 CIRCULAR_DEPENDENCY | {"status":409,"data":{"error":"This change would create a circular dependency.","code":"CIRCULAR_DEPENDENCY"}} | PASS |
| 15 | Original rewatch Avengers: Doomsday | Avengers: Doomsday | 7 predecessors in valid order | {"status":200,"titles":["Iron Man","Captain America: The First Avenger","The Avengers","Captain America: Civil War","Thor: Ragnarok","Avengers: Infinity War","Avengers: Endgame"],"watchedCount":4,"totalCount":7,"unwatchedRuntime":460,"closure":7,"actual":7,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedMatches":true,"runtimeMatches":true} | PASS |
| 16 | Original rewatch Captain America: Civil War | Captain America: Civil War | 3 predecessors in valid order | {"status":200,"titles":["Iron Man","Captain America: The First Avenger","The Avengers"],"watchedCount":3,"totalCount":3,"unwatchedRuntime":0,"closure":3,"actual":3,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedMatches":true,"runtimeMatches":true} | PASS |
| 17 | Original rewatch Thor: Ragnarok | Thor: Ragnarok | 0 predecessors in valid order | {"status":200,"titles":[],"watchedCount":0,"totalCount":0,"unwatchedRuntime":0,"closure":0,"actual":0,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedMatches":true,"runtimeMatches":true} | PASS |
| 18 | Rewatch API no prerequisites | target TEST id 87 | 0 unique predecessors, target excluded, order/count/runtime correct | {"status":200,"titles":[],"closure":0,"actual":0,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedCount":0,"watchedMatches":true,"unwatchedRuntime":0,"runtimeMatches":true} | PASS |
| 19 | Rewatch API straight line | target TEST id 90 | 2 unique predecessors, target excluded, order/count/runtime correct | {"status":200,"titles":["TEST Final 1795207932555 line 1","TEST Final 1795207932555 line 2"],"closure":2,"actual":2,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedCount":0,"watchedMatches":true,"unwatchedRuntime":240,"runtimeMatches":true} | PASS |
| 20 | Rewatch API shared diamond | target TEST id 94 | 3 unique predecessors, target excluded, order/count/runtime correct | {"status":200,"titles":["TEST Final 1795207932555 diamond base","TEST Final 1795207932555 diamond left","TEST Final 1795207932555 diamond right"],"closure":3,"actual":3,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedCount":0,"watchedMatches":true,"unwatchedRuntime":360,"runtimeMatches":true} | PASS |
| 21 | Rewatch API 10-prerequisite chain | target TEST id 105 | 10 unique predecessors, target excluded, order/count/runtime correct | {"status":200,"titles":["TEST Final 1795207932555 long 01","TEST Final 1795207932555 long 02","TEST Final 1795207932555 long 03","TEST Final 1795207932555 long 04","TEST Final 1795207932555 long 05","TEST Final 1795207932555 long 06","TEST Final 1795207932555 long 07","TEST Final 1795207932555 long 08","TEST Final 1795207932555 long 09","TEST Final 1795207932555 long 10"],"closure":10,"actual":10,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedCount":0,"watchedMatches":true,"unwatchedRuntime":1200,"runtimeMatches":true} | PASS |
| 22 | Rewatch UI TEST Doomsday | target TEST chain, four ancestors watched | 4 of 7, 3 unique unwatched predecessors and matching remaining runtime | {"summary":"WATCHED\n4 of 7\nTIME LEFT\n6h 0m","progress":"4","uiChainTitle":"TEST Final 1795207932555 Avengers: Doomsday","plan":{"titles":["TEST Final 1795207932555 Iron Man","TEST Final 1795207932555 Captain America: The First Avenger","TEST Final 1795207932555 The Avengers","TEST Final 1795207932555 Captain America: Civil War","TEST Final 1795207932555 Thor: Ragnarok","TEST Final 1795207932555 Avengers: Infinity War","TEST Final 1795207932555 Avengers: Endgame"],"remaining":360},"check7":{"closure":7,"actual":7,"noDuplicates":true,"targetExcluded":true,"allPresent":true,"validOrder":true,"watchedCount":4,"watchedMatches":true,"unwatchedRuntime":360,"runtimeMatches":true}} | PASS |
| 23 | Rewatch untick UI | click same prerequisite again | progress returns to 4 of 7 | WATCHED<br>4 of 7<br>TIME LEFT<br>6h 0m | PASS |
| 24 | Create cinema API sample 1 3 4 | [1,3,4] | 201 and exact bundle sizes | {"status":201,"data":{"id":18,"name":"TEST Final 1795207932555 sample 1 3 4","bundleSizes":[1,3,4]}} | PASS |
| 25 | Create cinema API sample 2 5 | [2,5] | 201 and exact bundle sizes | {"status":201,"data":{"id":19,"name":"TEST Final 1795207932555 sample 2 5","bundleSizes":[2,5]}} | PASS |
| 26 | Create cinema API sample 6 9 20 | [6,9,20] | 201 and exact bundle sizes | {"status":201,"data":{"id":20,"name":"TEST Final 1795207932555 sample 6 9 20","bundleSizes":[6,9,20]}} | PASS |
| 27 | Create cinema API sample 4 6 | [4,6] | 201 and exact bundle sizes | {"status":201,"data":{"id":21,"name":"TEST Final 1795207932555 sample 4 6","bundleSizes":[4,6]}} | PASS |
| 28 | Create cinema API one size 1 | [1] | 201 and exact bundle sizes | {"status":201,"data":{"id":22,"name":"TEST Final 1795207932555 one size 1","bundleSizes":[1]}} | PASS |
| 29 | Create cinema API one size 500 | [500] | 201 and exact bundle sizes | {"status":201,"data":{"id":23,"name":"TEST Final 1795207932555 one size 500","bundleSizes":[500]}} | PASS |
| 30 | Create cinema API ten sizes | [1,2,3,4,5,6,7,8,9,10] | 201 and exact bundle sizes | {"status":201,"data":{"id":24,"name":"TEST Final 1795207932555 ten sizes","bundleSizes":[1,2,3,4,5,6,7,8,9,10]}} | PASS |
| 31 | Create cinema API extremes | [1,500] | 201 and exact bundle sizes | {"status":201,"data":{"id":25,"name":"TEST Final 1795207932555 extremes","bundleSizes":[1,500]}} | PASS |
| 32 | Booking quote API sample 1,3,4 group 6 | [1,3,4]; group 6 | 2 bundles | {"status":200,"quote":{"cinema":{"id":18,"name":"TEST Final 1795207932555 sample 1 3 4"},"groupSize":6,"possible":true,"bundleCount":2,"bundles":[{"size":3,"count":2}]},"independentMinimum":2,"seatSum":6,"returnedCount":2} | PASS |
| 33 | Booking quote API sample 2,5 group 11 | [2,5]; group 11 | 4 bundles | {"status":200,"quote":{"cinema":{"id":19,"name":"TEST Final 1795207932555 sample 2 5"},"groupSize":11,"possible":true,"bundleCount":4,"bundles":[{"size":5,"count":1},{"size":2,"count":3}]},"independentMinimum":4,"seatSum":11,"returnedCount":4} | PASS |
| 34 | Booking quote API sample 6,9,20 group 44 | [6,9,20]; group 44 | 4 bundles | {"status":200,"quote":{"cinema":{"id":20,"name":"TEST Final 1795207932555 sample 6 9 20"},"groupSize":44,"possible":true,"bundleCount":4,"bundles":[{"size":20,"count":1},{"size":9,"count":2},{"size":6,"count":1}]},"independentMinimum":4,"seatSum":44,"returnedCount":4} | PASS |
| 35 | Booking quote API sample 4,6 group 7 | [4,6]; group 7 | exact or not possible | {"status":200,"quote":{"cinema":{"id":21,"name":"TEST Final 1795207932555 sample 4 6"},"groupSize":7,"possible":false},"independentMinimum":null,"seatSum":null,"returnedCount":null} | PASS |
| 36 | Booking quote API group 1 | [1]; group 1 | 1 bundles | {"status":200,"quote":{"cinema":{"id":22,"name":"TEST Final 1795207932555 one size 1"},"groupSize":1,"possible":true,"bundleCount":1,"bundles":[{"size":1,"count":1}]},"independentMinimum":1,"seatSum":1,"returnedCount":1} | PASS |
| 37 | Booking quote API group 2 | [1,3,4]; group 2 | 2 bundles | {"status":200,"quote":{"cinema":{"id":18,"name":"TEST Final 1795207932555 sample 1 3 4"},"groupSize":2,"possible":true,"bundleCount":2,"bundles":[{"size":1,"count":2}]},"independentMinimum":2,"seatSum":2,"returnedCount":2} | PASS |
| 38 | Booking quote API group 10000 | [1,2,3,4,5,6,7,8,9,10]; group 10000 | 1000 bundles | {"status":200,"quote":{"cinema":{"id":24,"name":"TEST Final 1795207932555 ten sizes"},"groupSize":10000,"possible":true,"bundleCount":1000,"bundles":[{"size":10,"count":1000}]},"independentMinimum":1000,"seatSum":10000,"returnedCount":1000} | PASS |
| 39 | Booking quote API many bundles | [1]; group 99 | 99 bundles | {"status":200,"quote":{"cinema":{"id":22,"name":"TEST Final 1795207932555 one size 1"},"groupSize":99,"possible":true,"bundleCount":99,"bundles":[{"size":1,"count":99}]},"independentMinimum":99,"seatSum":99,"returnedCount":99} | PASS |
| 40 | Booking quote API 500 bundle x20 | [500]; group 10000 | 20 bundles | {"status":200,"quote":{"cinema":{"id":23,"name":"TEST Final 1795207932555 one size 500"},"groupSize":10000,"possible":true,"bundleCount":20,"bundles":[{"size":500,"count":20}]},"independentMinimum":20,"seatSum":10000,"returnedCount":20} | PASS |
| 41 | Booking quote API size 500 not exact | [500]; group 1 | exact or not possible | {"status":200,"quote":{"cinema":{"id":23,"name":"TEST Final 1795207932555 one size 500"},"groupSize":1,"possible":false},"independentMinimum":null,"seatSum":null,"returnedCount":null} | PASS |
| 42 | Booking quote API ten sizes group37 | [1,2,3,4,5,6,7,8,9,10]; group 37 | exact or not possible | {"status":200,"quote":{"cinema":{"id":24,"name":"TEST Final 1795207932555 ten sizes"},"groupSize":37,"possible":true,"bundleCount":4,"bundles":[{"size":10,"count":3},{"size":7,"count":1}]},"independentMinimum":4,"seatSum":37,"returnedCount":4} | PASS |
| 43 | Cinema validation zero sizes | {"name":"TEST Final 1795207932555 empty cinema","bundleSizes":[]} | 400 invalid | {"status":400,"data":{"error":"A cinema needs between 1 and 10 bundle sizes."}} | PASS |
| 44 | Cinema validation 11 sizes | {"name":"TEST Final 1795207932555 11 sizes","bundleSizes":[1,2,3,4,5,6,7,8,9,10,11]} | 400 invalid | {"status":400,"data":{"error":"A cinema needs between 1 and 10 bundle sizes."}} | PASS |
| 45 | Cinema validation duplicate sizes | {"name":"TEST Final 1795207932555 duplicate sizes","bundleSizes":[2,2]} | 400 invalid | {"status":400,"data":{"error":"Bundle sizes must be different."}} | PASS |
| 46 | Cinema validation bundle zero | {"name":"TEST Final 1795207932555 zero bundle","bundleSizes":[0]} | 400 invalid | {"status":400,"data":{"error":"Each bundle size must be a whole number from 1 to 500."}} | PASS |
| 47 | Cinema validation bundle 501 | {"name":"TEST Final 1795207932555 501 bundle","bundleSizes":[501]} | 400 invalid | {"status":400,"data":{"error":"Each bundle size must be a whole number from 1 to 500."}} | PASS |
| 48 | Cinema validation duplicate cinema name | {"name":"TEST Final 1795207932555 sample 1 3 4","bundleSizes":[2]} | 409 duplicate | {"status":409,"data":{"error":"That title or cinema name is already in use."}} | PASS |
| 49 | Group-size validation zero | 0 | 400 invalid | {"status":400,"data":{"error":"Group size must be a whole number from 1 to 10000."}} | PASS |
| 50 | Group-size validation over max | 10001 | 400 invalid | {"status":400,"data":{"error":"Group size must be a whole number from 1 to 10000."}} | PASS |
| 51 | Group-size validation negative | -1 | 400 invalid | {"status":400,"data":{"error":"Group size must be a whole number from 1 to 10000."}} | PASS |
| 52 | Group-size validation text | abc | 400 invalid | {"status":400,"data":{"error":"Group size must be a whole number from 1 to 10000."}} | PASS |
| 53 | Group-size validation empty |  | 400 invalid | {"status":400,"data":{"error":"Group size must be a whole number from 1 to 10000."}} | PASS |
| 54 | API error JSON unknown API | /api/no-such-route | 4xx JSON error body | {"status":404,"data":{"error":"API endpoint not found."}} | PASS |
| 55 | API error JSON missing movie | /api/movies/999999/rewatch-order | 4xx JSON error body | {"status":404,"data":{"error":"Movie not found."}} | PASS |
| 56 | API error JSON missing cinema | /api/cinemas/999999/booking?groupSize=2 | 4xx JSON error body | {"status":404,"data":{"error":"Cinema not found."}} | PASS |
| 57 | Booking quote button UI | TEST cinema bundle sizes 2,5 group 11 | Shows four bundles, 5�1 and 2�3 | 4 bundles<br><br>5 seats<br>× 1<br><br>2 seats<br>× 3 | PASS |
| 58 | Booking native input 0 | 0 | input validity false | false | PASS |
| 59 | Booking native input 10001 | 10001 | input validity false | false | PASS |
| 60 | Booking native input negative | -1 | input validity false | false | PASS |
| 61 | Booking native input empty |  | input validity false | false | PASS |
| 62 | Brand home link | click DOOMSDAY READY logo | Opens Movies | / | PASS |
| 63 | Hero CTA | Build your rewatch plan | Opens Rewatch Plan | /rewatch.html | PASS |
| 64 | Navigation Movies | / | matching view and route | / | PASS |
| 65 | Navigation Rewatch Plan | /rewatch.html | matching view and route | /rewatch.html | PASS |
| 66 | Navigation Booking | /booking.html | matching view and route | /booking.html | PASS |
| 67 | Browser back | Rewatch Plan ? back | Returns to previous route | /booking.html | PASS |
| 68 | 390px layout Movies | viewport 390px | no horizontal overflow | {"viewport":390,"scroll":390} | PASS |
| 69 | 390px layout Rewatch Plan | viewport 390px | no horizontal overflow | {"viewport":390,"scroll":390} | PASS |
| 70 | 390px layout Booking | viewport 390px | no horizontal overflow | {"viewport":390,"scroll":490} | FAIL |
| 71 | Circular dependency UI error | two TEST movies create a loop | UI clearly displays CIRCULAR_DEPENDENCY | This change would create a circular dependency. | FAIL |
| 72 | Browser console errors | all visited routes | none | 404 at https://doomsday-ready-one.vercel.app/favicon.ico | FAIL |
| 73 | Failed network requests | all visited routes | none | [] | PASS |
| 74 | Responses >3 seconds | all visited routes | none | [{"url":"https://doomsday-ready-one.vercel.app/posters/captain-america-the-first-avenger.jpg","ms":3140},{"url":"https://doomsday-ready-one.vercel.app/posters/avengers-infinity-war.jpg","ms":4291},{"url":"https://doomsday-ready-one.vercel.app/posters/thor-ragnarok.jpg","ms":5310},{"url":"https://doomsday-ready-one.vercel.app/posters/the-avengers.jpg","ms":6027},{"url":"https://doomsday-ready-one.vercel.app/posters/captain-america-civil-war.jpg","ms":6553}] | FAIL |
| 75 | Movies native validation empty title |  | blocked by native validity | false | PASS |
| 76 | Movies native validation missing year |  | blocked by native validity | false | PASS |
| 77 | Movies native validation runtime 0 | 0 | blocked by native validity | false | PASS |
| 78 | Movies native validation runtime 301 | 301 | blocked by native validity | false | PASS |
| 79 | Movies native validation runtime negative | -1 | blocked by native validity | false | PASS |
| 80 | Movies runtime field type | type attribute | number input rejects alphabetic text | number | PASS |
| 81 | Rewatch view TEST no prerequisite | TEST Final 1795207932555 empty target | 0 predecessors, target excluded | {"count":0,"names":[],"target":"TEST Final 1795207932555 empty target","summary":"WATCHED\n0 of 0\nTIME LEFT\n0h 0m","empty":["No earlier movies in this plan."]} | PASS |
| 82 | Rewatch view TEST straight line | TEST Final 1795207932555 line target | 2 predecessors, target excluded | {"count":2,"names":["TEST Final 1795207932555 line 1","TEST Final 1795207932555 line 2"],"target":"TEST Final 1795207932555 line target","summary":"WATCHED\n0 of 2\nTIME LEFT\n4h 0m","empty":[]} | PASS |
| 83 | Rewatch view TEST shared diamond | TEST Final 1795207932555 diamond target | 3 predecessors, target excluded | {"count":3,"names":["TEST Final 1795207932555 diamond base","TEST Final 1795207932555 diamond left","TEST Final 1795207932555 diamond right"],"target":"TEST Final 1795207932555 diamond target","summary":"WATCHED\n0 of 3\nTIME LEFT\n6h 0m","empty":[]} | PASS |
| 84 | Rewatch view TEST ten-deep chain | TEST Final 1795207932555 long 11 | 10 predecessors, target excluded | {"count":10,"names":["TEST Final 1795207932555 long 01","TEST Final 1795207932555 long 02","TEST Final 1795207932555 long 03","TEST Final 1795207932555 long 04","TEST Final 1795207932555 long 05","TEST Final 1795207932555 long 06","TEST Final 1795207932555 long 07","TEST Final 1795207932555 long 08","TEST Final 1795207932555 long 09","TEST Final 1795207932555 long 10"],"target":"TEST Final 1795207932555 long 11","summary":"WATCHED\n0 of 10\nTIME LEFT\n20h 0m","empty":[]} | PASS |
| 85 | Rewatch view original Doomsday | Avengers: Doomsday | 7 predecessors, target excluded | {"count":7,"names":["Iron Man","Captain America: The First Avenger","The Avengers","Captain America: Civil War","Thor: Ragnarok","Avengers: Infinity War","Avengers: Endgame"],"target":"Avengers: Doomsday","summary":"WATCHED\n4 of 7\nTIME LEFT\n7h 40m","empty":[]} | PASS |
| 86 | Rewatch view original Civil War | Captain America: Civil War | 3 predecessors, target excluded | {"count":3,"names":["Iron Man","Captain America: The First Avenger","The Avengers"],"target":"Captain America: Civil War","summary":"WATCHED\n3 of 3\nTIME LEFT\n0h 0m","empty":[]} | PASS |
| 87 | Rewatch view original Ragnarok | Thor: Ragnarok | 0 predecessors, target excluded | {"count":0,"names":[],"target":"Thor: Ragnarok","summary":"WATCHED\n0 of 0\nTIME LEFT\n0h 0m","empty":["No earlier movies in this plan."]} | PASS |
| 88 | Booking view sample 1 3 4 | group 6 | 2 bundles | 2 bundles<br><br>3 seats<br>× 2 | PASS |
| 89 | Booking view sample 2 5 | group 11 | 4 bundles | 4 bundles<br><br>5 seats<br>× 1<br><br>2 seats<br>× 3 | PASS |
| 90 | Booking view sample 6 9 20 | group 44 | 4 bundles | 4 bundles<br><br>20 seats<br>× 1<br><br>9 seats<br>× 2<br><br>6 seats<br>× 1 | PASS |
| 91 | Booking view sample 4 6 | group 7 | Not possible | Not possible<br><br>Those bundles don’t add up to exactly 7 seats. | PASS |
| 92 | Booking view one size 1 | group 10000 | 10000 bundles | 10000 bundles<br><br>1 seats<br>× 10000 | PASS |
| 93 | Booking view one size 500 | group 10000 | 20 bundles | 20 bundles<br><br>500 seats<br>× 20 | PASS |
| 94 | Booking view ten sizes | group 37 | 4 bundles | 4 bundles<br><br>10 seats<br>× 3<br><br>7 seats<br>× 1 | PASS |
| 95 | Booking 390px overflow details | 390px | no element wider than viewport | {"viewport":390,"scroll":490,"wide":[{"tag":"FORM","cls":"booking-card","width":473,"left":17},{"tag":"H2","cls":"","width":429,"left":39},{"tag":"LABEL","cls":"","width":429,"left":39},{"tag":"INPUT","cls":"","width":429,"left":39},{"tag":"LABEL","cls":"","width":429,"left":39},{"tag":"INPUT","cls":"","width":429,"left":39},{"tag":"FORM","cls":"booking-card","width":473,"left":17},{"tag":"H2","cls":"","width":429,"left":39},{"tag":"LABEL","cls":"","width":429,"left":39},{"tag":"SELECT","cls":"","width":429,"left":39},{"tag":"LABEL","cls":"","width":429,"left":39},{"tag":"INPUT","cls":"","width":429,"left":39}]} | FAIL |
| 96 | Watched toggle initial | TEST Livecheck manual 1795207357266 | starts false | {"watched":false,"aria":"Mark TEST Livecheck manual 1795207357266 watched"} | PASS |
| 97 | Watched toggle on | TEST Livecheck manual 1795207357266 | false?true | {"watched":true,"aria":"Mark TEST Livecheck manual 1795207357266 watched"} | PASS |
| 98 | Watched toggle off | TEST Livecheck manual 1795207357266 | true?false | {"watched":false,"aria":"Mark TEST Livecheck manual 1795207357266 unwatched"} | PASS |
| 99 | Prerequisite add UI | TEST Livecheck 1795206174385 max | contains TEST Livecheck 1795206174385 mid | [31] | PASS |
| 100 | Prerequisite removal UI | TEST Livecheck 1795206174385 max | empty prerequisites | [] | PASS |
| 101 | Rewatch first unwatched tick | TEST chain 4/7 ? click Thor: Ragnarok | 5 of 7 and 4h remaining | WATCHED<br>5 of 7<br>TIME LEFT<br>4h 0m | PASS |
| 102 | Rewatch first unwatched untick | TEST chain 5/7 ? untick Thor: Ragnarok | 4 of 7 and 6h remaining | WATCHED<br>4 of 7<br>TIME LEFT<br>6h 0m | PASS |
| 103 | Movie watch feedback after settle | TEST movie 41 false?true | watched true, button checked, label says unwatched | {"watched":true,"aria":"Mark TEST Livecheck manual 1795207357266 unwatched","className":"poster-check checked"} | PASS |
| 104 | Movie watch feedback after untick | TEST movie 41 true?false | watched false, button clear, label says watched | {"watched":false,"aria":"Mark TEST Livecheck manual 1795207357266 watched","className":"poster-check "} | PASS |
| 105 | Cinema picker after reload | TEST Final 1795207932555 UI cinema | available after reload | ["TEST Final 1795207932555 UI cinema · 2, 5"] | PASS |
| 106 | Movie list after reload | TEST Livecheck manual 1795207357266 | visible after reload | true | PASS |
| 107 | UI movie add runtime 1 | TEST Livecheck 1795207174519 base; year 2026, runtime 1 | 201, watched false | {"id":39,"title":"TEST Livecheck 1795207174519 base","year":2026,"runtime":1,"watched":false} | PASS |
| 108 | UI movie add runtime 150 with prerequisite | TEST Livecheck manual 1795207357266; year 2015, runtime 150, prerequisite id 39 | 201; prerequisite saved | {"status":201,"id":41,"title":"TEST Livecheck manual 1795207357266","runtime":150,"watched":false,"prerequisites":[39]} | PASS |
| 109 | UI movie add runtime 300 | TEST Livecheck 1795207174519 max; year 1990, runtime 300 | 201 | {"id":40,"title":"TEST Livecheck 1795207174519 max","year":1990,"runtime":300,"watched":false,"prerequisites":[39]} | PASS |
| 110 | UI cinema create visibility delay | TEST Final 1795207932555 UI cinema; sizes 2,5 | 201 and immediately in picker | 201; picker visibility immediately false; visible after reload true | FAIL |
| 111 | Poster asset iron-man.jpg | GET /posters/iron-man.jpg | 200 | 200; 432776 bytes | PASS |
| 112 | Poster asset captain-america-the-first-avenger.jpg | GET /posters/captain-america-the-first-avenger.jpg | 200 | 200; 731930 bytes | PASS |
| 113 | Poster asset the-avengers.jpg | GET /posters/the-avengers.jpg | 200 | 200; 1662064 bytes | PASS |
| 114 | Poster asset captain-america-civil-war.jpg | GET /posters/captain-america-civil-war.jpg | 200 | 200; 5622991 bytes | PASS |
| 115 | Poster asset thor-ragnarok.jpg | GET /posters/thor-ragnarok.jpg | 200 | 200; 5283937 bytes | PASS |
| 116 | Poster asset avengers-infinity-war.jpg | GET /posters/avengers-infinity-war.jpg | 200 | 200; 811654 bytes | PASS |
| 117 | Poster asset avengers-endgame.jpg | GET /posters/avengers-endgame.jpg | 200 | 200; 210964 bytes | PASS |
| 118 | Poster asset avengers-doomsday.jpg | GET /posters/avengers-doomsday.jpg | 200 | 200; 131771 bytes | PASS |
| 119 | Favicon request | GET /favicon.ico | 200; no console error | 404; console: Failed to load resource: the server responded with a status of 404 () | FAIL |
| 120 | Pre-cleanup safety check | 80 movie IDs, 10 cinema IDs | All TEST; no other/new rows; baseline originals match | {"trackedMovieIds":80,"foundMovieIds":80,"trackedCinemaIds":10,"foundCinemaIds":10,"otherM":[],"otherC":[],"unsafeM":[],"unsafeC":[],"originalMoviesMatch":true,"originalCinemasMatch":true} | PASS |
| 121 | Cleanup and baseline comparison | Delete exactly tracked TEST records | All TEST rows removed; original arrays byte-for-byte equal | {"deleted":{"testMovies":80,"testCinemas":10,"moviePrerequisiteRows":55,"cinemaBundleRows":28},"compare":{"baselineMovies":9,"afterMovies":9,"baselineCinemas":1,"afterCinemas":1,"moviesExact":true,"cinemasExact":true,"testMoviesRemaining":0,"testCinemasRemaining":0},"baseline":{"movies":[{"id":29,"title":"ironman","releaseYear":2000,"runtime":121,"watched":false,"prerequisites":[7,8]},{"id":7,"title":"Iron Man","releaseYear":2008,"runtime":126,"watched":true,"prerequisites":[]},{"id":8,"title":"Captain America: The First Avenger","releaseYear":2011,"runtime":124,"watched":true,"prerequisites":[]},{"id":9,"title":"The Avengers","releaseYear":2012,"runtime":143,"watched":true,"prerequisites":[7,8]},{"id":10,"title":"Captain America: Civil War","releaseYear":2016,"runtime":147,"watched":true,"prerequisites":[9]},{"id":11,"title":"Thor: Ragnarok","releaseYear":2017,"runtime":130,"watched":false,"prerequisites":[]},{"id":12,"title":"Avengers: Infinity War","releaseYear":2018,"runtime":149,"watched":false,"prerequisites":[10,11]},{"id":13,"title":"Avengers: Endgame","releaseYear":2019,"runtime":181,"watched":false,"prerequisites":[12]},{"id":14,"title":"Avengers: Doomsday","releaseYear":2026,"runtime":180,"watched":false,"prerequisites":[13]}],"cinemas":[{"id":15,"name":"dooms day","bundleSizes":[2]}]},"after":{"movies":[{"id":29,"title":"ironman","releaseYear":2000,"runtime":121,"watched":false,"prerequisites":[7,8]},{"id":7,"title":"Iron Man","releaseYear":2008,"runtime":126,"watched":true,"prerequisites":[]},{"id":8,"title":"Captain America: The First Avenger","releaseYear":2011,"runtime":124,"watched":true,"prerequisites":[]},{"id":9,"title":"The Avengers","releaseYear":2012,"runtime":143,"watched":true,"prerequisites":[7,8]},{"id":10,"title":"Captain America: Civil War","releaseYear":2016,"runtime":147,"watched":true,"prerequisites":[9]},{"id":11,"title":"Thor: Ragnarok","releaseYear":2017,"runtime":130,"watched":false,"prerequisites":[]},{"id":12,"title":"Avengers: Infinity War","releaseYear":2018,"runtime":149,"watched":false,"prerequisites":[10,11]},{"id":13,"title":"Avengers: Endgame","releaseYear":2019,"runtime":181,"watched":false,"prerequisites":[12]},{"id":14,"title":"Avengers: Doomsday","releaseYear":2026,"runtime":180,"watched":false,"prerequisites":[13]}],"cinemas":[{"id":15,"name":"dooms day","bundleSizes":[2]}]}} | PASS |

## Screenshots

- [00-smoke.png](./00-smoke.png)
- [01-baseline-movies.png](./01-baseline-movies.png)
- [02-movie-form.png](./02-movie-form.png)
- [03-movies-valid.png](./03-movies-valid.png)
- [04-movie-edit-watch.png](./04-movie-edit-watch.png)
- [23-after-manual-add.png](./23-after-manual-add.png)
- [24-reload-after-manual-add.png](./24-reload-after-manual-add.png)
- [30-live-home-before.png](./30-live-home-before.png)
- [31-booking-added-test-cinema.png](./31-booking-added-test-cinema.png)
- [32-rewatch-10-prerequisite-chain.png](./32-rewatch-10-prerequisite-chain.png)
- [32-rewatch-no-prerequisites.png](./32-rewatch-no-prerequisites.png)
- [32-rewatch-shared-diamond.png](./32-rewatch-shared-diamond.png)
- [32-rewatch-straight-line.png](./32-rewatch-straight-line.png)
- [33-rewatch-4-of-7.png](./33-rewatch-4-of-7.png)
- [34-rewatch-toggle-update.png](./34-rewatch-toggle-update.png)
- [35-booking-quote-ui.png](./35-booking-quote-ui.png)
- [36-refresh-booking.png](./36-refresh-booking.png)
- [36-refresh-movies.png](./36-refresh-movies.png)
- [36-refresh-rewatch-plan.png](./36-refresh-rewatch-plan.png)
- [37-mobile-booking.png](./37-mobile-booking.png)
- [37-mobile-movies.png](./37-mobile-movies.png)
- [37-mobile-rewatch-plan.png](./37-mobile-rewatch-plan.png)
- [38-cycle-error-ui.png](./38-cycle-error-ui.png)
- [39-movie-validation-fields.png](./39-movie-validation-fields.png)
- [40-movie-watched-toggle.png](./40-movie-watched-toggle.png)
- [41-movie-prerequisite-edit.png](./41-movie-prerequisite-edit.png)
- [42-rewatch-original-civil-war.png](./42-rewatch-original-civil-war.png)
- [42-rewatch-original-doomsday.png](./42-rewatch-original-doomsday.png)
- [42-rewatch-original-ragnarok.png](./42-rewatch-original-ragnarok.png)
- [42-rewatch-test-no-prerequisite.png](./42-rewatch-test-no-prerequisite.png)
- [42-rewatch-test-shared-diamond.png](./42-rewatch-test-shared-diamond.png)
- [42-rewatch-test-straight-line.png](./42-rewatch-test-straight-line.png)
- [42-rewatch-test-ten-deep-chain.png](./42-rewatch-test-ten-deep-chain.png)
- [43-booking-one-size-1-10000.png](./43-booking-one-size-1-10000.png)
- [43-booking-one-size-500-10000.png](./43-booking-one-size-500-10000.png)
- [43-booking-sample-1-3-4-6.png](./43-booking-sample-1-3-4-6.png)
- [43-booking-sample-2-5-11.png](./43-booking-sample-2-5-11.png)
- [43-booking-sample-4-6-7.png](./43-booking-sample-4-6-7.png)
- [43-booking-sample-6-9-20-44.png](./43-booking-sample-6-9-20-44.png)
- [43-booking-ten-sizes-37.png](./43-booking-ten-sizes-37.png)
- [44-mobile-booking-overflow.png](./44-mobile-booking-overflow.png)
- [45-watched-on.png](./45-watched-on.png)
- [46-watched-off.png](./46-watched-off.png)
- [47-prerequisite-added.png](./47-prerequisite-added.png)
- [48-prerequisite-removed.png](./48-prerequisite-removed.png)
- [49-watched-feedback-delay.png](./49-watched-feedback-delay.png)
- [50-rewatch-tick-first-unwatched.png](./50-rewatch-tick-first-unwatched.png)
- [51-rewatch-untick.png](./51-rewatch-untick.png)
- [52-rewatch-debug.png](./52-rewatch-debug.png)
- [53-movie-after-reload.png](./53-movie-after-reload.png)

## Cleanup verification

{
  "deleted": {
    "testMovies": 80,
    "testCinemas": 10,
    "moviePrerequisiteRows": 55,
    "cinemaBundleRows": 28
  },
  "compare": {
    "baselineMovies": 9,
    "afterMovies": 9,
    "baselineCinemas": 1,
    "afterCinemas": 1,
    "moviesExact": true,
    "cinemasExact": true,
    "testMoviesRemaining": 0,
    "testCinemasRemaining": 0
  },
  "baseline": {
    "movies": [
      {
        "id": 29,
        "title": "ironman",
        "releaseYear": 2000,
        "runtime": 121,
        "watched": false,
        "prerequisites": [
          7,
          8
        ]
      },
      {
        "id": 7,
        "title": "Iron Man",
        "releaseYear": 2008,
        "runtime": 126,
        "watched": true,
        "prerequisites": []
      },
      {
        "id": 8,
        "title": "Captain America: The First Avenger",
        "releaseYear": 2011,
        "runtime": 124,
        "watched": true,
        "prerequisites": []
      },
      {
        "id": 9,
        "title": "The Avengers",
        "releaseYear": 2012,
        "runtime": 143,
        "watched": true,
        "prerequisites": [
          7,
          8
        ]
      },
      {
        "id": 10,
        "title": "Captain America: Civil War",
        "releaseYear": 2016,
        "runtime": 147,
        "watched": true,
        "prerequisites": [
          9
        ]
      },
      {
        "id": 11,
        "title": "Thor: Ragnarok",
        "releaseYear": 2017,
        "runtime": 130,
        "watched": false,
        "prerequisites": []
      },
      {
        "id": 12,
        "title": "Avengers: Infinity War",
        "releaseYear": 2018,
        "runtime": 149,
        "watched": false,
        "prerequisites": [
          10,
          11
        ]
      },
      {
        "id": 13,
        "title": "Avengers: Endgame",
        "releaseYear": 2019,
        "runtime": 181,
        "watched": false,
        "prerequisites": [
          12
        ]
      },
      {
        "id": 14,
        "title": "Avengers: Doomsday",
        "releaseYear": 2026,
        "runtime": 180,
        "watched": false,
        "prerequisites": [
          13
        ]
      }
    ],
    "cinemas": [
      {
        "id": 15,
        "name": "dooms day",
        "bundleSizes": [
          2
        ]
      }
    ]
  },
  "after": {
    "movies": [
      {
        "id": 29,
        "title": "ironman",
        "releaseYear": 2000,
        "runtime": 121,
        "watched": false,
        "prerequisites": [
          7,
          8
        ]
      },
      {
        "id": 7,
        "title": "Iron Man",
        "releaseYear": 2008,
        "runtime": 126,
        "watched": true,
        "prerequisites": []
      },
      {
        "id": 8,
        "title": "Captain America: The First Avenger",
        "releaseYear": 2011,
        "runtime": 124,
        "watched": true,
        "prerequisites": []
      },
      {
        "id": 9,
        "title": "The Avengers",
        "releaseYear": 2012,
        "runtime": 143,
        "watched": true,
        "prerequisites": [
          7,
          8
        ]
      },
      {
        "id": 10,
        "title": "Captain America: Civil War",
        "releaseYear": 2016,
        "runtime": 147,
        "watched": true,
        "prerequisites": [
          9
        ]
      },
      {
        "id": 11,
        "title": "Thor: Ragnarok",
        "releaseYear": 2017,
        "runtime": 130,
        "watched": false,
        "prerequisites": []
      },
      {
        "id": 12,
        "title": "Avengers: Infinity War",
        "releaseYear": 2018,
        "runtime": 149,
        "watched": false,
        "prerequisites": [
          10,
          11
        ]
      },
      {
        "id": 13,
        "title": "Avengers: Endgame",
        "releaseYear": 2019,
        "runtime": 181,
        "watched": false,
        "prerequisites": [
          12
        ]
      },
      {
        "id": 14,
        "title": "Avengers: Doomsday",
        "releaseYear": 2026,
        "runtime": 180,
        "watched": false,
        "prerequisites": [
          13
        ]
      }
    ],
    "cinemas": [
      {
        "id": 15,
        "name": "dooms day",
        "bundleSizes": [
          2
        ]
      }
    ]
  }
}

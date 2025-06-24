Background:

Our amateur radio group assists in a race. The race covers a large area with limited to no cell phone reception. At the start line, we populate a list of all bib numbers the checkpoints (aid stations) and the distance between points. Sometime sthere are multiple courses using the same checkpoints.  We mark those that "Did Not Start" as DNS. Radio operators at each checkpoint will radio in when runners arrive, when the sweeps arrive, as well as requests for supplies, runners that "DNF" (did not finish).  They also may let us know when some runners depart (especially sweeps), and when the station shuts down because they are expecting no more runners.

Net control will receive these reports and move the runner bib numbers to the appropriate checkpoint, as well as log any other reports. This is mostly done on paper, as most operators can not type as fast as a bib report will come in. But once we record the report, we then upddate runners last know position on the computer. The exact time of arrival at a checkpoint is NOT important - often runners arriving within a 5-10 minute window are grouped together. Their final time is tracked at the finish line by the race organizers. The timing we have at checkpoints gives us and visitors a general idea of how the race is progressing as a whole and 

We have been using a modified version of nullboard to track this. Nullboard is a fully self contained kanban board, that stores everything in the browser's cache. We've used a python script to generate the data (bib numbers and checkpoints).  Then we use a mouse to drag individual cards across. The modification is to allow multiple kanban cards to fit in a row. Nullboard does not really track time, that is still tracked separately on paper.

We display nullboard on a TV display outside the van so others can check on race progress or look for a participant they came to support.

See the @old/nullboard for code and data files.  See @old/screenshots for screenshots of how this looks, especially 20240727_114149.jpg which shows two courses - a 50k and a Half Marathon. 

## Example Course:

50k: 
Start to Skyline 8.6 miles
Skyline to Burnt House: 8.3 Miles, Total: 16.9M
Burnt House to Lost Children: 6.6M, total: 23.5M
Lost Children to Hair Pin: 3.5M, total: 27M
Hair Pin to Finish: 4M, total: 62M

Half Marathon:
Start to Lost Children: 5.7M, Total: 5.7M
Lost Children to Hairpin: 3.5M, Total: 9.2M
Hairpin to Finish: 4M, total: 13.2M


### Other notes

Every so often, we make a hand copy of the movements with times and provide to race coordinators so they can update their course pacing.

### Goal

What we want to do is improve upon this. We still anticipate operators recording messages on paper and then transfering to computer. But we'd like to have a sort of pop up box to type in the bib numbers in batches and have the app move the bib numbers from where they were to where they arrived.  As they type numbers, it should suggest auto complete. The times should be retained.

Things we want
- columns per aid station
- possibly swim lanes for the different courses
- retain the ability to drag and drop bibs
- click a button or press a hot key to get a data entry window
- log messages (aid station hairpin closed at 10:05)
- enter batches bib numbers as arrived or departed an aid station
  - we can leave the bib numbers at the station, but they should visually indicate the deparated state
- able to quickly add participants (such as a 50 Sweep) if they weren't added initially
- recent activity is highlighted in some way so that visitors can look for updates
- provide after action reports to race control - various formats, such as CSV or PDF/easily printable
  - per aid station chronological
  - per bib chronological
- provide partial update reports to race control 
  - activity since last report, broken down by aid station
  - we have an idea of sending these to a bluetooth thermal/receipt printer as we deem necessary. Today we write this out onto slips of paper and hand deliver it.  If it was to a wireless printer at the race coordinator's desk, we could send them updates through the race. 

Additional:
- we may not have internet, this needs to work offline
- nullboard works as a static file and data is stored in the browser storage. This is fine, but means only one browser can view or edit it at a time. In the future, maybe we want to put a tablet or other computer on local wifi to view reports
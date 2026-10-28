-- Three scheduled collection checks per day; manual refresh remains available.
SELECT cron.schedule('silvae-kindle-progress','0 */8 * * *','SELECT silvae_private.dispatch_kindle_jobs()');

-- Ensure auto-updates from mock attempts and overall recalc happen automatically
-- 1) Trigger to compute per-topic readiness from completed mock attempts
DROP TRIGGER IF EXISTS trg_auto_readiness_from_mock ON public.mock_attempts;
CREATE TRIGGER trg_auto_readiness_from_mock
AFTER INSERT OR UPDATE OF status ON public.mock_attempts
FOR EACH ROW
EXECUTE FUNCTION public.auto_readiness_from_mock();

-- 2) Trigger to recalc overall readiness (profiles.exam_readiness) after any readiness_history insert
DROP TRIGGER IF EXISTS trg_recalc_readiness_after_history ON public.readiness_history;
CREATE TRIGGER trg_recalc_readiness_after_history
AFTER INSERT ON public.readiness_history
FOR EACH ROW
EXECUTE FUNCTION public.tg_recalc_readiness();;

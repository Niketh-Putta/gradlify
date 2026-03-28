-- Fix the create_profile_for_new_user function to have proper permissions
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.profiles (user_id, tier, updated_at)
  values (new.id, 'free', now())
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

-- Recreate the trigger to ensure it's properly connected
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user();;

-- This function is triggered when a new user signs up.
-- It creates a corresponding entry in the public.profiles table.
CREATE OR REPLACE FUNCTION public.create_public_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, full_name, photo_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger calls the function after a new user is created.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_public_profile_for_user();

-- This function is triggered when a user is deleted
-- It deletes the corresponding entry in the public.profiles table
CREATE OR REPLACE FUNCTION public.delete_public_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.profiles WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger calls the function after a user is deleted
DROP TRIGGER IF EXISTS on_auth_user_deleted on auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.delete_public_profile_for_user();

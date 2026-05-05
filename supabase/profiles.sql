-- ============================================================
-- SECURE SCHEMA: public.profiles
-- ============================================================
-- Este script configura RLS estricto para la tabla profiles.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor)
--
-- Políticas:
--   SELECT: cada usuario ve solo su perfil; admins ven todos
--   INSERT: solo el trigger puede crear perfiles (desde auth.users)
--   UPDATE: cada usuario puede editar solo su perfil; admins pueden editar todos
--   DELETE: nadie puede borrar perfiles directamente (cascade desde auth.users)
-- ============================================================

-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas viejas (abridoras)
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- 4. Política SELECT: usuarios ven su perfil; admins ven todos
DROP POLICY IF EXISTS "Users view own profile or admin views all" ON public.profiles;
CREATE POLICY "Users view own profile or admin views all"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Política INSERT: solo el trigger de auth.users puede insertar
--    El trigger corre con privilegios elevados (bypass RLS) porque
--    está en el schema public y es SECURITY DEFINER por defecto.
DROP POLICY IF EXISTS "Trigger only insert" ON public.profiles;
CREATE POLICY "Trigger only insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (false);  -- bloquea inserciones directas; el trigger bypass RLS

-- 6. Política UPDATE: usuarios editan su propio perfil; admins editan todos
DROP POLICY IF EXISTS "Users update own or admin updates all" ON public.profiles;
CREATE POLICY "Users update own or admin updates all"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Trigger: crear perfil automáticamente al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'vendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Suscribir trigger a auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Asegurar que el schema public sea accesible para la extensión auth
--    (generalmente ya está, pero por si acaso)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

SELECT 'Schema public.profiles asegurado correctamente.' AS resultado;

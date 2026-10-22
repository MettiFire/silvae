DROP POLICY IF EXISTS books_update_auth ON public.books;
REVOKE UPDATE ON public.books FROM authenticated, anon;
SELECT flags.country, flags.flag, capitals.capital FROM public.flags 
INNER JOIN capitals on capitals.id = flags.id; 
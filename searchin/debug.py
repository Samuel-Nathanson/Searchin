# Using unique names for global variables to avoid conflict with other variables
__searchin__debug__stdout__ = None
__searchin__debug__stderr__ = None

def set_sys_stdout(file):
    global __searchin__debug__stdout__
    __searchin__debug__stdout__ = file

def set_sys_stderr(file):
    global __searchin__debug__stderr__
    __searchin__debug__stderr__ = file

def print_searchin(string):
    print(string, file=__searchin__debug__stdout__)

def print_searchin_err(string):
    print(string, file=__searchin__debug__stderr__)

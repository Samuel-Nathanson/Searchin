# Using unique names for global variables to avoid conflict with other variables
# Strategic use of global variables
__searchin__debug__stdout__ = None
__searchin__debug__stderr__ = None

def set_sys_stdout(file):
    global __searchin__debug__stdout__
    __searchin__debug__stdout__ = file

def set_sys_stderr(file):
    global __searchin__debug__stderr__
    __searchin__debug__stderr__ = file

def print_searchin(string):
    global __searchin__debug__stdout__
    global __searchin__debug__stderr__

    # future: We can probably refactor this for clarity
    if(__searchin__debug__stdout__ == None):
        if(__searchin__debug__stderr__ == None):
            import sys
            of = sys.stderr
        else:
            of = __searchin__debug__stderr__
    else:
        of = __searchin__debug__stdout__

    print(string, file=of)

def print_searchin_err(string):
    global __searchin__debug__stdout__
    global __searchin__debug__stderr__

    # future: We can probably refactor this for clarity
    if(__searchin__debug__stderr__ == None):
        if(__searchin__debug__stdout__ == None):
            import sys
            of = sys.stderr
        else:
            of = __searchin__debug__stderr__
    else:
        of = __searchin__debug__stderr__

    print(string, file=__searchin__debug__stderr__)


def api_calls(_events):
    import matplotlib.pyplot as plt
    import math

    events = _events
    minimum = math.inf
    maximum = 1 - math.inf
    for e in _events:
        for f in events[0][0]:
            if(f[0] < minimum):
                minimum = f[0]
            if(f[0] > maximum):
                maximum = f[0]

    for e in range(0, len(_events)):
        times = _events[e][0]
        for t in range(0,len(times)):
            events[e][0][t] = (events[e][0][t][0] - minimum, events[e][0][t][1])

    fig, ax = plt.subplots()

    for i in range(0,len(events)):
        ax.broken_barh(events[i][0], (i*10+2, 7),
                       facecolors=('tab:cyan', 'tab:orange', 'tab:green', 'tab:red'))
    ax.set_ylim(1, len(events)*10)
    # plt.xlim(0, maximum - minimum)
    ax.set_xlabel('seconds since start')
    ax.set_yticks([(x+0.5)*(100/len(events)) for x in range(0, len(events))])
    ax.set_yticklabels(["{}\n{}".format(x[1], x[2]) for x in events])
    plt.subplots_adjust(left=0.35, right=0.9, top=0.9, bottom=0.1)

    ax.grid(True)
    import time
    fig = plt.gcf()
    fig.set_size_inches(24.4, 10.8)
    plt.savefig("searchin-optimization-path-{}.eps".format(time.strftime('%H:%M:%S', time.gmtime(time.time()))),
        format='eps',
        dpi=100)
    plt.show()

